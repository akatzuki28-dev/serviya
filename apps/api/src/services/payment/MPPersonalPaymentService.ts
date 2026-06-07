import axios from "axios";
import type { Order } from "@sp/db";
import type {
  PaymentLink,
  PaymentEvent,
  PaymentService,
} from "./PaymentService";

const MP_API = "https://api.mercadopago.com";

interface MPPreferenceResponse {
  id: string;
  init_point: string;
}

interface MPPaymentResponse {
  id: number;
  status: string;
  external_reference: string;
  transaction_amount: number;
}

export class MPPersonalPaymentService implements PaymentService {
  private readonly accessToken: string;
  private readonly appUrl: string;
  private readonly apiUrl: string;

  constructor() {
    this.accessToken = process.env["MP_ACCESS_TOKEN"] ?? "";
    this.appUrl = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";
    this.apiUrl = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000";
  }

  async createPaymentLink(order: Order): Promise<PaymentLink> {
    const expiration = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    const body = {
      items: [
        {
          title: `Servicio: ${order.serviceType}`,
          quantity: 1,
          unit_price: Number(order.grossAmount),
          currency_id: "ARS",
        },
      ],
      back_urls: {
        success: `${this.appUrl}/orden/${order.id}/confirmada`,
        failure: `${this.appUrl}/orden/${order.id}/pago-fallido`,
        pending: `${this.appUrl}/orden/${order.id}/pago-pendiente`,
      },
      notification_url: `${this.apiUrl}/api/webhooks/mp`,
      external_reference: order.id,
      expires: true,
      expiration_date_to: expiration,
    };

    const { data } = await axios.post<MPPreferenceResponse>(
      `${MP_API}/checkout/preferences`,
      body,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    return { url: data.init_point, externalId: data.id };
  }

  async verifyWebhook(
    payload: unknown,
    _signature: string
  ): Promise<PaymentEvent> {
    // La verificación de firma ya ocurrió en el middleware validateMPWebhook
    const body = payload as { data?: { id?: string } };
    const paymentId = body.data?.id;

    if (!paymentId) {
      throw new Error("Missing payment_id in webhook payload");
    }

    const { data } = await axios.get<MPPaymentResponse>(
      `${MP_API}/v1/payments/${paymentId}`,
      { headers: { Authorization: `Bearer ${this.accessToken}` } }
    );

    return {
      orderId: data.external_reference,
      paymentId: String(data.id),
      status: data.status as PaymentEvent["status"],
      amount: data.transaction_amount,
    };
  }

  async refund(paymentId: string, amount: number): Promise<void> {
    await axios.post(
      `${MP_API}/v1/payments/${paymentId}/refunds`,
      { amount },
      { headers: { Authorization: `Bearer ${this.accessToken}` } }
    );
  }
}
