import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { UalaBisPaymentService } from "../../src/services/payment/UalaBisPaymentService";

vi.mock("axios");

const TOKEN = { data: { access_token: "TKN-1", expires_in: 3600 } };

beforeEach(() => {
  (axios as any).post = vi.fn();
  (axios as any).get = vi.fn();
});

const baseOrder: any = {
  id: "order-uuid-1",
  serviceType: "limpieza",
  grossAmount: "10000.00",
  scheduledAt: new Date(),
};

describe("UalaBisPaymentService.createPaymentLink", () => {
  it("pide token, crea checkout y retorna {url, externalId}", async () => {
    (axios as any).post
      .mockResolvedValueOnce(TOKEN) // 1. token
      .mockResolvedValueOnce({
        data: { uuid: "U-1", links: { checkout_link: "https://uala/co/U-1" } },
      }); // 2. checkout

    const svc = new UalaBisPaymentService();
    const link = await svc.createPaymentLink(baseOrder);

    expect(link).toEqual({ url: "https://uala/co/U-1", externalId: "U-1" });

    // 1er POST: token
    const [tokenUrl, tokenBody] = (axios as any).post.mock.calls[0];
    expect(tokenUrl).toContain("/v2/api/auth/token");
    expect(tokenBody.client_id).toBe("test-uala-client-id");
    expect(tokenBody.grant_type).toBe("client_credentials");

    // 2do POST: checkout
    const [coUrl, coBody, coOpts] = (axios as any).post.mock.calls[1];
    expect(coUrl).toContain("/v2/api/checkout");
    expect(coBody.amount).toBe(10000);
    expect(coBody.external_reference).toBe("order-uuid-1");
    expect(coBody.callback_success).toContain("/orden/order-uuid-1/confirmada");
    expect(coBody.notification_url).toContain("/api/webhooks/uala?secret=test-uala-webhook-secret");
    expect(coOpts.headers.Authorization).toBe("Bearer TKN-1");
  });

  it("acepta checkout_link en la raíz (sin links{})", async () => {
    (axios as any).post
      .mockResolvedValueOnce(TOKEN)
      .mockResolvedValueOnce({ data: { uuid: "U-2", checkout_link: "https://uala/co/U-2" } });
    const svc = new UalaBisPaymentService();
    const link = await svc.createPaymentLink(baseOrder);
    expect(link).toEqual({ url: "https://uala/co/U-2", externalId: "U-2" });
  });

  it("lanza si la respuesta no trae checkout_link", async () => {
    (axios as any).post
      .mockResolvedValueOnce(TOKEN)
      .mockResolvedValueOnce({ data: { uuid: "U-3" } });
    const svc = new UalaBisPaymentService();
    await expect(svc.createPaymentLink(baseOrder)).rejects.toThrow(/checkout_link/);
  });

  it("reusa el token cacheado entre llamadas (un solo POST a /token)", async () => {
    (axios as any).post
      .mockResolvedValueOnce(TOKEN)
      .mockResolvedValueOnce({ data: { uuid: "A", links: { checkout_link: "u" } } })
      .mockResolvedValueOnce({ data: { uuid: "B", links: { checkout_link: "u" } } });
    const svc = new UalaBisPaymentService();
    await svc.createPaymentLink(baseOrder);
    await svc.createPaymentLink(baseOrder);
    const tokenCalls = (axios as any).post.mock.calls.filter((c: any[]) =>
      String(c[0]).includes("/auth/token")
    );
    expect(tokenCalls).toHaveLength(1);
  });
});

describe("UalaBisPaymentService.verifyWebhook", () => {
  beforeEach(() => {
    (axios as any).post.mockResolvedValue(TOKEN); // cualquier POST = token
  });

  it("re-consulta la orden y devuelve PaymentEvent normalizado (APPROVED)", async () => {
    (axios as any).get.mockResolvedValueOnce({
      data: { uuid: "U-1", external_reference: "order-uuid-1", status: "APPROVED", amount: 10000 },
    });
    const svc = new UalaBisPaymentService();
    const ev = await svc.verifyWebhook({ uuid: "U-1" }, "");
    expect(ev).toEqual({
      orderId: "order-uuid-1",
      paymentId: "U-1",
      status: "approved",
      amount: 10000,
    });
    const [url] = (axios as any).get.mock.calls[0];
    expect(url).toContain("/v2/api/orders/U-1");
  });

  it.each([
    ["APPROVED", "approved"],
    ["PROCESSED", "approved"],
    ["REJECTED", "rejected"],
    ["REFUNDED", "refunded"],
    ["EXPIRED", "cancelled"],
    ["WHATEVER", "pending"],
  ])("mapea estado %s → %s", async (ualaStatus, expected) => {
    (axios as any).get.mockResolvedValueOnce({
      data: { uuid: "U-1", external_reference: "o", status: ualaStatus, amount: 1 },
    });
    const svc = new UalaBisPaymentService();
    const ev = await svc.verifyWebhook({ uuid: "U-1" }, "");
    expect(ev.status).toBe(expected);
  });

  it("acepta uuid anidado en data{}", async () => {
    (axios as any).get.mockResolvedValueOnce({
      data: { uuid: "U-9", external_reference: "o9", status: "APPROVED", amount: 5 },
    });
    const svc = new UalaBisPaymentService();
    const ev = await svc.verifyWebhook({ data: { uuid: "U-9" } }, "");
    expect(ev.paymentId).toBe("U-9");
  });

  it("lanza si falta uuid en el payload", async () => {
    const svc = new UalaBisPaymentService();
    await expect(svc.verifyWebhook({}, "")).rejects.toThrow(/Missing uuid/);
  });
});

describe("UalaBisPaymentService.refund", () => {
  it("POST al endpoint de refund de la orden con monto", async () => {
    (axios as any).post.mockResolvedValue(TOKEN);
    const svc = new UalaBisPaymentService();
    await svc.refund("U-1", 5000);
    // El último POST es el refund (el primero fue el token).
    const calls = (axios as any).post.mock.calls;
    const [url, body] = calls[calls.length - 1];
    expect(url).toContain("/v2/api/orders/U-1/refund");
    expect(body.amount).toBe("5000");
  });
});
