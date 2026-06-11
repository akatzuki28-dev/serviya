import { Router } from "express";
import { getDb, schema } from "@sp/db";
import { eq, and, inArray } from "drizzle-orm";
import { validateMobbexWebhook } from "../../middlewares/validateWebhook";
import { MobbexPaymentService } from "../../services/payment/MobbexPaymentService";
import { NotificationService } from "../../services/NotificationService";

export const mobbexWebhookRouter = Router();
const paymentService = new MobbexPaymentService();

mobbexWebhookRouter.post("/", validateMobbexWebhook, async (req, res) => {
  // Responder 200 inmediatamente para que Mobbex no reintente.
  res.status(200).send("OK");

  // Mobbex notifica el resultado del pago con type "payment".
  const type = req.body?.type as string | undefined;
  if (type !== "payment") return;

  try {
    const event = await paymentService.verifyWebhook(req.body, "");
    const db = getDb();

    const order = await db.query.orders.findFirst({
      where: eq(schema.orders.id, event.orderId),
      with: { provider: true },
    });

    if (!order) {
      console.error(
        `Order ${event.orderId} not found for Mobbex payment ${event.paymentId}`
      );
      return;
    }

    // Estados en los que la orden ya está pagada (el servicio puede estar en
    // curso o completado). Desde acá un reembolso/contracargo es válido.
    const PAID_STATES = [
      "PAGADA",
      "CONFIRMADA",
      "EN_CAMINO",
      "EN_PROGRESO",
      "COMPLETADA",
    ] as const;

    // Todas las transiciones usan un UPDATE condicional sobre el estado actual y
    // miran returning(): atómico e idempotente sin lock explícito. Si Mobbex
    // reintenta el webhook, solo el primero matchea el WHERE; el segundo
    // actualiza 0 filas y se ignora. También evita pisar un estado que ya no
    // corresponde (ej: pago aprobado tardío sobre CANCELADA).
    if (event.status === "approved") {
      const updated = await db
        .update(schema.orders)
        .set({
          status: "PAGADA",
          paymentProvider: "mobbex",
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
          `[mobbex webhook] approved ${event.paymentId} ignorado: orden ${order.id} en estado ${order.status}`
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
          paymentProvider: "mobbex",
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
          `[mobbex webhook] ${event.status} ${event.paymentId} ignorado: orden ${order.id} en estado ${order.status}`
        );
        return;
      }

      await db.insert(schema.orderStatusHistory).values({
        orderId: order.id,
        status: "PAGO_FALLIDO",
        changedBy: "system",
      });
    } else if (event.status === "refunded" || event.status === "charged_back") {
      // Reembolso o contracargo sobre una orden ya pagada → REEMBOLSADA.
      const updated = await db
        .update(schema.orders)
        .set({
          status: "REEMBOLSADA",
          paymentProvider: "mobbex",
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
          `[mobbex webhook] ${event.status} ${event.paymentId} ignorado: orden ${order.id} en estado ${order.status}`
        );
        return;
      }

      await db.insert(schema.orderStatusHistory).values({
        orderId: order.id,
        status: "REEMBOLSADA",
        changedBy: "system",
      });
    }
    // Otros estados (pending / en proceso) → no-op: esperamos el próximo aviso
    // de Mobbex con el estado definitivo.
  } catch (err) {
    console.error("Mobbex webhook processing error:", err);
  }
});
