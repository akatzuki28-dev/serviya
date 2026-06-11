import axios from "axios";
import type { Order } from "@sp/db";
import type {
  PaymentLink,
  PaymentEvent,
  PaymentEventStatus,
  PaymentService,
} from "./PaymentService";

const MOBBEX_API = "https://api.mobbex.com";

interface MobbexCheckoutResponse {
  result: boolean;
  data: { id: string; url: string };
}

interface MobbexOperationResponse {
  result: boolean;
  data: {
    transaction: {
      payment: {
        id: string;
        reference: string;
        total: number;
        status: { code: number | string; text?: string };
      };
    };
  };
}

// Mapea el código de estado de Mobbex a nuestro PaymentEventStatus normalizado.
// Códigos de referencia (Mobbex):
//   200            → aprobado
//   2,210,300,301  → en proceso / revisión → lo tratamos como pendiente (no-op)
//   401            → checkout vencido → cancelado
//   3,400          → rechazado
//   601,602,603…   → familia de devoluciones/contracargos
// Cualquier código desconocido cae en "pending" (no-op) para no pisar el estado
// de la orden con un cambio que no entendemos: esperamos el próximo aviso.
function mapStatus(code: number): PaymentEventStatus {
  if (code === 200) return "approved";
  if (code === 401) return "cancelled";
  if ([3, 400].includes(code)) return "rejected";
  if (code === 602 || code === 603) return "charged_back";
  if (code >= 600 && code < 700) return "refunded";
  return "pending";
}

export class MobbexPaymentService implements PaymentService {
  private readonly apiKey: string;
  private readonly accessToken: string;
  private readonly webhookSecret: string;
  private readonly testMode: boolean;
  private readonly appUrl: string;
  private readonly apiUrl: string;

  constructor() {
    this.apiKey = process.env["MOBBEX_API_KEY"] ?? "";
    this.accessToken = process.env["MOBBEX_ACCESS_TOKEN"] ?? "";
    this.webhookSecret = process.env["MOBBEX_WEBHOOK_SECRET"] ?? "";
    this.testMode = process.env["MOBBEX_TEST"] === "true";
    this.appUrl = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";
    this.apiUrl = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000";
  }

  private headers() {
    return {
      "x-api-key": this.apiKey,
      "x-access-token": this.accessToken,
      "Content-Type": "application/json",
    };
  }

  async createPaymentLink(order: Order): Promise<PaymentLink> {
    const total = Number(order.grossAmount);

    const body = {
      total,
      currency: "ars",
      description: `Servicio: ${order.serviceType}`,
      // reference debe ser único por transacción; usamos el id de la orden, que
      // además es lo que Mobbex nos devuelve en el webhook para mapear de vuelta.
      reference: order.id,
      test: this.testMode,
      // Mobbex redirige acá al terminar; la página lee el estado real de la orden
      // desde la DB (que actualiza el webhook, fuente de verdad).
      return_url: `${this.appUrl}/orden/${order.id}/confirmada`,
      // El webhook no viene firmado: el secreto compartido viaja en el query y lo
      // valida validateMobbexWebhook.
      webhook: `${this.apiUrl}/api/webhooks/mobbex?secret=${this.webhookSecret}`,
      timeout: 2880, // 48 hs en minutos (mismo vencimiento que el link de MP)
      items: [{ description: `Servicio: ${order.serviceType}`, quantity: 1, total }],
    };

    const { data } = await axios.post<MobbexCheckoutResponse>(
      `${MOBBEX_API}/p/checkout`,
      body,
      { headers: this.headers() }
    );

    return { url: data.data.url, externalId: data.data.id };
  }

  async verifyWebhook(
    payload: unknown,
    _signature: string
  ): Promise<PaymentEvent> {
    const body = payload as { data?: { payment?: { id?: string } } };
    const paymentId = body.data?.payment?.id;

    if (!paymentId) {
      throw new Error("Missing payment id in Mobbex webhook payload");
    }

    // No confiamos en el body (Mobbex no firma el webhook): re-consultamos la
    // operación a la API como fuente de verdad del estado y el monto.
    const { data } = await axios.get<MobbexOperationResponse>(
      `${MOBBEX_API}/p/operations/${paymentId}`,
      { headers: this.headers() }
    );

    const payment = data.data.transaction.payment;

    return {
      orderId: payment.reference,
      paymentId: String(payment.id),
      status: mapStatus(Number(payment.status.code)),
      amount: Number(payment.total),
    };
  }

  async refund(paymentId: string, _amount: number): Promise<void> {
    // Mobbex hace la devolución total vía GET /p/operations/{id}/refund. La
    // devolución parcial usa otro flujo; en el piloto reembolsamos el total.
    await axios.get(`${MOBBEX_API}/p/operations/${paymentId}/refund`, {
      headers: this.headers(),
    });
  }
}
