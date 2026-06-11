import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { MPPersonalPaymentService } from "../../src/services/payment/MPPersonalPaymentService";

vi.mock("axios");

const mockedAxios = axios as unknown as {
  post: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
};

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

describe("MPPersonalPaymentService.createPaymentLink", () => {
  it("envía preference correcta y retorna {url, externalId}", async () => {
    (axios as any).post.mockResolvedValue({
      data: { id: "PREF-1", init_point: "https://mp/pay/PREF-1" },
    });

    const svc = new MPPersonalPaymentService();
    const link = await svc.createPaymentLink(baseOrder);

    expect(link).toEqual({ url: "https://mp/pay/PREF-1", externalId: "PREF-1" });
    const [url, body, opts] = (axios as any).post.mock.calls[0];
    expect(url).toContain("/checkout/preferences");
    expect(body.items[0].unit_price).toBe(10000);
    expect(body.items[0].currency_id).toBe("ARS");
    expect(body.external_reference).toBe("order-uuid-1");
    expect(body.back_urls.success).toContain("/orden/order-uuid-1/confirmada");
    expect(body.notification_url).toContain("/api/webhooks/mp");
    expect(opts.headers.Authorization).toBe("Bearer TEST-mp-token");
  });

  it("incluye expiración a 48hs", async () => {
    (axios as any).post.mockResolvedValue({
      data: { id: "P", init_point: "u" },
    });
    const svc = new MPPersonalPaymentService();
    await svc.createPaymentLink(baseOrder);
    const body = (axios as any).post.mock.calls[0][1];
    expect(body.expires).toBe(true);
    const diff =
      new Date(body.expiration_date_to).getTime() - Date.now();
    expect(diff).toBeGreaterThan(47 * 3600 * 1000);
    expect(diff).toBeLessThanOrEqual(48 * 3600 * 1000 + 1000);
  });

  it("propaga error de MP (500/400)", async () => {
    (axios as any).post.mockRejectedValue(new Error("MP 500"));
    const svc = new MPPersonalPaymentService();
    await expect(svc.createPaymentLink(baseOrder)).rejects.toThrow("MP 500");
  });
});

describe("MPPersonalPaymentService.verifyWebhook", () => {
  it("fetch del pago y devuelve PaymentEvent normalizado", async () => {
    (axios as any).get.mockResolvedValue({
      data: {
        id: 999,
        status: "approved",
        external_reference: "order-uuid-1",
        transaction_amount: 10000,
      },
    });
    const svc = new MPPersonalPaymentService();
    const ev = await svc.verifyWebhook({ data: { id: "999" } }, "");
    expect(ev).toEqual({
      orderId: "order-uuid-1",
      paymentId: "999",
      status: "approved",
      amount: 10000,
    });
  });

  it("lanza si falta payment_id en el payload", async () => {
    const svc = new MPPersonalPaymentService();
    await expect(svc.verifyWebhook({}, "")).rejects.toThrow(/Missing payment_id/);
  });

  it("propaga error si MP devuelve 404 (payment_id inexistente)", async () => {
    (axios as any).get.mockRejectedValue(new Error("404 Not Found"));
    const svc = new MPPersonalPaymentService();
    await expect(svc.verifyWebhook({ data: { id: "ghost" } }, "")).rejects.toThrow();
  });
});

describe("MPPersonalPaymentService.refund", () => {
  it("POST al endpoint de refund con monto", async () => {
    (axios as any).post.mockResolvedValue({ data: { id: 1 } });
    const svc = new MPPersonalPaymentService();
    await svc.refund("PAY-1", 5000);
    const [url, body] = (axios as any).post.mock.calls[0];
    expect(url).toContain("/v1/payments/PAY-1/refunds");
    expect(body).toEqual({ amount: 5000 });
  });
});
