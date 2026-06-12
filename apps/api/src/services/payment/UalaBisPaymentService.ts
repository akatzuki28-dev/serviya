import axios, { AxiosError } from "axios";
import type { Order } from "@sp/db";
import type {
  PaymentLink,
  PaymentEvent,
  PaymentEventStatus,
  PaymentService,
} from "./PaymentService";

// Hosts de la API v2 de Ualá Bis (confirmados contra el plugin oficial de
// WooCommerce). Se pueden sobreescribir por env si Ualá cambia los dominios.
const HOSTS = {
  production: {
    auth: "https://auth.developers.ar.ua.la",
    api: "https://checkout.developers.ar.ua.la",
  },
  staging: {
    auth: "https://auth.stage.developers.ar.ua.la",
    api: "https://checkout.stage.developers.ar.ua.la",
  },
};

interface UalaTokenResponse {
  access_token: string;
  expires_in: number; // segundos
}

interface UalaCheckoutResponse {
  uuid: string;
  links?: { checkout_link?: string };
  checkout_link?: string;
}

interface UalaOrderResponse {
  uuid: string;
  external_reference: string;
  status: string;
  amount: number | string;
}

// Mapea el estado de la orden de Ualá a nuestro PaymentEventStatus.
//   APPROVED  → pago exitoso y desembolsado
//   PROCESSED → pago capturado, pendiente de desembolso al comercio
// Para ServiYa ambos significan que el cliente pagó → la orden queda PAGADA.
//   REJECTED  → rechazado
//   REFUNDED  → devolución
// Estados desconocidos → "pending" (no-op): esperamos el próximo aviso.
function mapStatus(status: string): PaymentEventStatus {
  switch (status?.toUpperCase()) {
    case "APPROVED":
    case "PROCESSED":
      return "approved";
    case "REJECTED":
      return "rejected";
    case "EXPIRED":
    case "CANCELLED":
    case "CANCELED":
      return "cancelled";
    case "REFUNDED":
      return "refunded";
    default:
      return "pending";
  }
}

export class UalaBisPaymentService implements PaymentService {
  private readonly userName: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly webhookSecret: string;
  private readonly authBase: string;
  private readonly apiBase: string;
  private readonly appUrl: string;
  private readonly apiUrl: string;

  // Cache del token de acceso (OAuth client_credentials). Ualá lo devuelve con
  // expires_in; lo reusamos hasta poco antes de vencer.
  private authToken: string | null = null;
  private authTokenExpiresAt = 0;

  constructor() {
    // .trim() defensivo: evita 401 "Invalid credentials" por un espacio/salto de
    // línea que se cuela al pegar el valor en el panel de variables de Railway.
    this.userName = (process.env["UALA_USERNAME"] ?? "").trim();
    this.clientId = (process.env["UALA_CLIENT_ID"] ?? "").trim();
    this.clientSecret = (process.env["UALA_CLIENT_SECRET"] ?? "").trim();
    this.webhookSecret = (process.env["UALA_WEBHOOK_SECRET"] ?? "").trim();

    const env = process.env["UALA_ENV"] === "staging" ? "staging" : "production";
    this.authBase = process.env["UALA_AUTH_BASE_URL"] ?? HOSTS[env].auth;
    this.apiBase = process.env["UALA_API_BASE_URL"] ?? HOSTS[env].api;

    this.appUrl = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";
    this.apiUrl = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000";
  }

  private webhookUrl(): string {
    return `${this.apiUrl}/api/webhooks/uala?secret=${this.webhookSecret}`;
  }

  // Envuelve un error de axios en un Error legible que dice la fase, el método,
  // la URL, el status HTTP y lo que respondió Ualá. Útil para diagnosticar en
  // los logs sin exponer las credenciales (solo viaja la respuesta de Ualá).
  private wrapError(phase: string, err: unknown): Error {
    if (err instanceof AxiosError) {
      const status = err.response?.status ?? "no-response";
      const method = err.config?.method?.toUpperCase() ?? "?";
      const url = err.config?.url ?? "?";
      const data = err.response?.data;
      const body =
        typeof data === "string" ? data : data ? JSON.stringify(data) : err.message;
      return new Error(`UALA ${phase} ${method} ${url} → ${status}: ${body}`);
    }
    return new Error(`UALA ${phase}: ${(err as Error)?.message ?? String(err)}`);
  }

  // Devuelve un Bearer token válido, refrescándolo si está por vencer.
  private async ensureToken(): Promise<string> {
    // Margen de 30s para no usar un token al borde del vencimiento.
    if (this.authToken && Date.now() < this.authTokenExpiresAt - 30_000) {
      return this.authToken;
    }

    try {
      const { data } = await axios.post<UalaTokenResponse>(
        `${this.authBase}/v2/api/auth/token`,
        {
          // La API v2 espera "username" (el SDK v1 usaba "user_name").
          username: this.userName,
          client_id: this.clientId,
          client_secret_id: this.clientSecret,
          grant_type: "client_credentials",
        }
      );

      this.authToken = data.access_token;
      this.authTokenExpiresAt = Date.now() + data.expires_in * 1000;
      return this.authToken;
    } catch (err) {
      throw this.wrapError("auth", err);
    }
  }

  private async authHeaders() {
    const token = await this.ensureToken();
    return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  }

  async createPaymentLink(order: Order): Promise<PaymentLink> {
    const body = {
      // amount es STRING con formato decimal "xxxx.xx" (la v2 valida punto único;
      // mín 25.00). NO existe campo "origin" en la v2 → no se envía.
      amount: Number(order.grossAmount).toFixed(2),
      description: `Servicio: ${order.serviceType}`,
      // external_reference mapea el webhook de vuelta a nuestra orden.
      external_reference: order.id,
      callback_success: `${this.appUrl}/orden/${order.id}/confirmada`,
      callback_fail: `${this.appUrl}/orden/${order.id}/pago-fallido`,
      // Ualá NO firma los webhooks: el secreto compartido viaja en el query y lo
      // valida validateUalaWebhook.
      notification_url: this.webhookUrl(),
    };

    let data: UalaCheckoutResponse;
    try {
      const res = await axios.post<UalaCheckoutResponse>(
        `${this.apiBase}/v2/api/checkout`,
        body,
        { headers: await this.authHeaders() }
      );
      data = res.data;
    } catch (err) {
      throw this.wrapError("checkout", err);
    }

    const url = data.links?.checkout_link ?? data.checkout_link;
    if (!url) {
      throw new Error(
        `UALA checkout response missing checkout_link: ${JSON.stringify(data)}`
      );
    }

    return { url, externalId: data.uuid };
  }

  async verifyWebhook(
    payload: unknown,
    _signature: string
  ): Promise<PaymentEvent> {
    const body = payload as {
      uuid?: string;
      data?: { uuid?: string };
    };
    const uuid = body.uuid ?? body.data?.uuid;

    if (!uuid) {
      throw new Error("Missing uuid in Ualá webhook payload");
    }

    // No confiamos en el body (Ualá no firma el webhook): re-consultamos la orden
    // a la API como fuente de verdad del estado y el monto.
    const { data } = await axios.get<UalaOrderResponse>(
      `${this.apiBase}/v2/api/orders/${uuid}`,
      { headers: await this.authHeaders() }
    );

    return {
      orderId: data.external_reference,
      paymentId: String(data.uuid),
      status: mapStatus(data.status),
      amount: Number(data.amount),
    };
  }

  async refund(paymentId: string, amount: number): Promise<void> {
    await axios.post(
      `${this.apiBase}/v2/api/orders/${paymentId}/refund`,
      { amount: String(amount), notification_url: this.webhookUrl() },
      { headers: await this.authHeaders() }
    );
  }
}
