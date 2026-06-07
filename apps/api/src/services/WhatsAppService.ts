import axios from "axios";

const WA_API = "https://graph.facebook.com/v21.0";

export type WaTemplate =
  | "order_confirmation"
  | "payment_link"
  | "reminder_24h"
  | "provider_en_camino"
  | "order_completed_review"
  | "payment_received_transfer";

export class WhatsAppService {
  private readonly phoneNumberId: string;
  private readonly accessToken: string;

  constructor() {
    this.phoneNumberId = process.env["WA_PHONE_NUMBER_ID"] ?? "";
    this.accessToken = process.env["WA_ACCESS_TOKEN"] ?? "";
  }

  async sendTemplate(
    to: string,
    templateName: WaTemplate,
    variables: string[]
  ): Promise<void> {
    const components =
      variables.length > 0
        ? [
            {
              type: "body",
              parameters: variables.map((v) => ({ type: "text", text: v })),
            },
          ]
        : [];

    await axios.post(
      `${WA_API}/${this.phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        to: this.normalizePhone(to),
        type: "template",
        template: {
          name: templateName,
          language: { code: "es_AR" },
          components,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
  }

  async sendText(to: string, text: string): Promise<void> {
    await axios.post(
      `${WA_API}/${this.phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        to: this.normalizePhone(to),
        type: "text",
        text: { body: text },
      },
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
  }

  private normalizePhone(phone: string): string {
    // Asegurar formato E.164 sin el "+"
    return phone.replace(/\D/g, "").replace(/^0/, "54");
  }
}
