import { Router } from "express";
import { getDb, schema } from "@sp/db";
import { eq, and, inArray } from "drizzle-orm";
import { validateUalaWebhook } from "../../middlewares/validateWebhook";
import { UalaBisPaymentService } from "../../services/payment/UalaBisPaymentService";
import { NotificationService } from "../../services/NotificationService";

export const ualaWebhookRouter = Router();
const paymentService = new UalaBisPaymentService();

// Verificación de URL: algunos paneles (Ualá incluido) hacen un GET al
// notification_url para validar que el endpoint existe antes de guardarlo.
// Respondemos 200 para que la asociación del webhook no falle por "conexión".
ualaWebhookRouter.get("/", (_req, res) => {
  res.status(200).send("OK");
});

ualaWebhookRouter.post("/", validateUalaWebhook, async (req, res) => {
  // Responder 200 inmediatamente para que Ualá no reintente.
  res.status(200).send("OK");

  try {
    // verifyWebhook re-consulta la orden a Ualá (fuente de verdad). Si el payload
    // no trae uuid, lanza y caemos al catch sin tocar nada.
    const event = await paymentService.verifyWebhook(req.body, "");
    const db = getDb();

    const order = await db.query.orders.findFirst({
      where: eq(schema.orders.id, event.orderId),
      with: { provider: true },
    });

    if (!order) {
      console.error(
        `Order ${event.orderId} not found for Ualá order ${event.paymentId}`
      );
      return;
    }

    // Estados en los que la orden ya está pagada (el servicio puede estar en
    // curso o completado). Desde acá un reembolso es válido.
    const PAID_STATES = [
      "PAGADA",
      "CONFIRMADA",
      "EN_CAMINO",
      "EN_PROGRESO",
      "COMPLETADA",
    ] as const;

    // Todas las transiciones usan un UPDATE condicional sobre el estado actual y
    // miran returning(): atómico e idempotente sin lock explícito. Si Ualá
    // reintenta el webhook, solo el primero matchea el WHERE; el segundo
    // actualiza 0 filas y se ignora. También evita pisar un estado que ya no
    // corresponde (ej: pago aprobado tardío sobre CANCELADA).
    if (event.status === "approved") {
      const updated = await db
        .update(schema.orders)
        .set({
          status: "PAGADA",
          paymentProvider: "uala",
          gatewayPaymentId: event.paymentId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.orders.id, order.id),
            eq(schema.orders.status, "PENDIENTE_PAGO")
          )
        )
        .returning({ id: schema.orders.id });

      if (updated.length === 0) {
        console.warn(
          `[uala webhook] approved ${event.paymentId} ignorado: orden ${order.id} en estado ${order.status}`
        );
        return;
      }

      await db.insert(schema.orderStatusHistory).values({
        orderId: order.id,
        status: "PAGADA",
        changedBy: "system",
      });

      // El payout NO se crea acá: las liquidaciones salen de un único origen, el
      // generador de /admin/liquidaciones sobre órdenes COMPLETADA (al pagar
      // todavía no hay proveedor asignado ni servicio prestado).

      // Notificación al cliente: solo si la orden ya tiene un proveedor real
      // asignado. Sin proveedor no mandamos una "confirmación" con datos falsos.
      if (order.userId && order.provider?.name) {
        const user = await db.query.users.findFirst({
          where: eq(schema.users.id, order.userId),
        });
        if (user?.phone) {
          await NotificationService.orderConfirmed(
            order,
            user.phone,
            order.provider.name
          );
        }
      }
    } else if (event.status === "rejected" || event.status === "cancelled") {
      const updated = await db
        .update(schema.orders)
        .set({
          status: "PAGO_FALLIDO",
          paymentProvider: "uala",
          gatewayPaymentId: event.paymentId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.orders.id, order.id),
            eq(schema.orders.status, "PENDIENTE_PAGO")
          )
        )
        .returning({ id: schema.orders.id });

      if (updated.length === 0) {
        console.warn(
          `[uala webhook] ${event.status} ${event.paymentId} ignorado: orden ${order.id} en estado ${order.status}`
        );
        return;
      }

      await db.insert(schema.orderStatusHistory).values({
        orderId: order.id,
        status: "PAGO_FALLIDO",
        changedBy: "system",
      });
    } else if (event.status === "refunded" || event.status === "charged_back") {
      // Reembolso sobre una orden ya pagada → REEMBOLSADA.
      const updated = await db
        .update(schema.orders)
        .set({
          status: "REEMBOLSADA",
          paymentProvider: "uala",
          gatewayPaymentId: event.paymentId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.orders.id, order.id),
            inArray(schema.orders.status, [...PAID_STATES])
          )
        )
        .returning({ id: schema.orders.id });

      if (updated.length === 0) {
        console.warn(
          `[uala webhook] ${event.status} ${event.paymentId} ignorado: orden ${order.id} en estado ${order.status}`
        );
        return;
      }

      await db.insert(schema.orderStatusHistory).values({
        orderId: order.id,
        status: "REEMBOLSADA",
        changedBy: "system",
      });
    }
    // Otros estados (pending) → no-op: esperamos el próximo aviso de Ualá.
  } catch (err) {
    console.error("Ualá webhook processing error:", err);
  }
});
