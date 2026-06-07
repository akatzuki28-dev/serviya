import { Router } from "express";
import { getDb, schema } from "@sp/db";
import { eq } from "drizzle-orm";
import { validateMPWebhook } from "../../middlewares/validateWebhook";
import { MPPersonalPaymentService } from "../../services/payment/MPPersonalPaymentService";
import { NotificationService } from "../../services/NotificationService";

export const mpWebhookRouter = Router();
const paymentService = new MPPersonalPaymentService();

mpWebhookRouter.post("/", validateMPWebhook, async (req, res) => {
  // Responder 200 inmediatamente para que MP no reintente
  res.status(200).send("OK");

  const topic = req.query["topic"] as string | undefined;
  const type = req.body?.type as string | undefined;

  // Solo procesar notificaciones de pago
  if (topic !== "payment" && type !== "payment") return;

  try {
    const event = await paymentService.verifyWebhook(req.body, "");
    const db = getDb();

    // Idempotencia: ya procesamos este payment_id?
    const existing = await db.query.orders.findFirst({
      where: eq(schema.orders.mpPaymentId, event.paymentId),
    });

    if (existing) return; // Ya procesado

    const order = await db.query.orders.findFirst({
      where: eq(schema.orders.id, event.orderId),
      with: { provider: true },
    });

    if (!order) {
      console.error(`Order ${event.orderId} not found for MP payment ${event.paymentId}`);
      return;
    }

    if (event.status === "approved") {
      await db
        .update(schema.orders)
        .set({
          status: "PAGADA",
          mpPaymentId: event.paymentId,
          updatedAt: new Date(),
        })
        .where(eq(schema.orders.id, order.id));

      await db.insert(schema.orderStatusHistory).values({
        orderId: order.id,
        status: "PAGADA",
        changedBy: "system",
      });

      // Crear registro de payout para el proveedor
      if (order.providerId) {
        await db.insert(schema.providerPayouts).values({
          providerId: order.providerId,
          orderId: order.id,
          grossAmount: order.grossAmount,
          platformFee: order.platformFee,
          netAmount: order.netAmount,
          status: "PENDIENTE",
        });
      }

      // Notificación al cliente
      if (order.userId) {
        const user = await db.query.users.findFirst({
          where: eq(schema.users.id, order.userId),
        });
        if (user?.phone) {
          const providerName = (order as any).provider?.name ?? "Proveedor asignado";
          await NotificationService.orderConfirmed(order, user.phone, providerName);
        }
      }
    } else if (event.status === "rejected" || event.status === "cancelled") {
      await db
        .update(schema.orders)
        .set({
          status: "PAGO_FALLIDO",
          mpPaymentId: event.paymentId,
          updatedAt: new Date(),
        })
        .where(eq(schema.orders.id, order.id));

      await db.insert(schema.orderStatusHistory).values({
        orderId: order.id,
        status: "PAGO_FALLIDO",
        changedBy: "system",
      });
    }
  } catch (err) {
    console.error("MP webhook processing error:", err);
  }
});
