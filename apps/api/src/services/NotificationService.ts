import Queue from "bull";
import { WhatsAppService } from "./WhatsAppService";
import type { Order } from "@sp/db";

interface NotificationJob {
  type: "whatsapp_template" | "whatsapp_text";
  to: string;
  template?: string;
  variables?: string[];
  text?: string;
}

const notificationQueue = new Queue<NotificationJob>("notifications", {
  redis: process.env["REDIS_URL"] ?? "redis://localhost:6379",
});

const wa = new WhatsAppService();

notificationQueue.process(async (job) => {
  const { type, to, template, variables, text } = job.data;

  if (type === "whatsapp_template" && template) {
    await wa.sendTemplate(to, template as any, variables ?? []);
  } else if (type === "whatsapp_text" && text) {
    await wa.sendText(to, text);
  }
});

notificationQueue.on("failed", (job, err) => {
  console.error(`Notification job ${job.id} failed:`, err.message);
});

export class NotificationService {
  static async orderConfirmed(order: Order, phone: string, providerName: string) {
    const date = new Date(order.scheduledAt).toLocaleDateString("es-AR");
    const time = new Date(order.scheduledAt).toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    await notificationQueue.add({
      type: "whatsapp_template",
      to: phone,
      template: "order_confirmation",
      variables: [order.serviceType, date, time, providerName],
    });
  }

  static async paymentLink(
    phone: string,
    clientName: string,
    serviceType: string,
    paymentUrl: string,
    expiresIn: string
  ) {
    await notificationQueue.add({
      type: "whatsapp_template",
      to: phone,
      template: "payment_link",
      variables: [clientName, serviceType, paymentUrl, expiresIn],
    });
  }

  static async reminder24h(
    phone: string,
    clientName: string,
    serviceType: string,
    time: string,
    providerName: string
  ) {
    await notificationQueue.add({
      type: "whatsapp_template",
      to: phone,
      template: "reminder_24h",
      variables: [clientName, serviceType, time, providerName],
    });
  }

  static async providerEnCamino(phone: string, etaMinutes: string) {
    await notificationQueue.add({
      type: "whatsapp_template",
      to: phone,
      template: "provider_en_camino",
      variables: [etaMinutes],
    });
  }

  static async orderCompletedReview(
    phone: string,
    clientName: string,
    orderId: string
  ) {
    const reviewUrl = `${process.env["NEXT_PUBLIC_APP_URL"]}/orden/${orderId}/calificar`;
    await notificationQueue.add({
      type: "whatsapp_template",
      to: phone,
      template: "order_completed_review",
      variables: [clientName, reviewUrl],
    });
  }

  static async transferConfirmed(
    phone: string,
    clientName: string,
    amount: string,
    serviceType: string
  ) {
    await notificationQueue.add({
      type: "whatsapp_template",
      to: phone,
      template: "payment_received_transfer",
      variables: [clientName, amount, serviceType],
    });
  }

  static async transferReminder(phone: string, clientName: string, paymentUrl: string) {
    await notificationQueue.add({
      type: "whatsapp_text",
      to: phone,
      text: `Hola ${clientName} 👋 Aún no recibimos tu comprobante de transferencia. Podés también pagar por Mercado Pago: ${paymentUrl}`,
    });
  }
}
