import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { MobbexPaymentService } from "../../src/services/payment/MobbexPaymentService";

vi.mock("axios");

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

function opResponse(code: number) {
  return {
    data: {
      result: true,
      data: {
        transaction: {
          payment: {
            id: "MBX-999",
            reference: "order-uuid-1",
            total: 10000,
            status: { code, text: "x" },
          },
        },
      },
    },
  };
}

describe("MobbexPaymentService.createPaymentLink", () => {
  it("envía checkout correcto y retorna {url, externalId}", async () => {
    (axios as any).post.mockResolvedValue({
      data: { result: true, data: { id: "CHK-1", url: "https://mobbex/p/CHK-1" } },
    });

    const svc = new MobbexPaymentService();
    const link = await svc.createPaymentLink(baseOrder);

    expect(link).toEqual({ url: "https://mobbex/p/CHK-1", externalId: "CHK-1" });
    const [url, body, opts] = (axios as any).post.mock.calls[0];
    expect(url).toContain("/p/checkout");
    expect(body.total).toBe(10000);
    expect(body.currency).toBe("ars");
    expect(body.reference).toBe("order-uuid-1");
    expect(body.return_url).toContain("/orden/order-uuid-1/confirmada");
    expect(body.webhook).toContain("/api/webhooks/mobbex?secret=");
    expect(opts.headers["x-api-key"]).toBe("test-mobbex-api-key");
    expect(opts.headers["x-access-token"]).toBe("test-mobbex-access-token");
  });

  it("incluye el secreto compartido en el webhook URL", async () => {
    (axios as any).post.mockResolvedValue({
      data: { result: true, data: { id: "C", url: "u" } },
    });
    const svc = new MobbexPaymentService();
    await svc.createPaymentLink(baseOrder);
    const body = (axios as any).post.mock.calls[0][1];
    expect(body.webhook).toContain("secret=test-mobbex-webhook-secret");
    expect(body.timeout).toBe(2880);
  });

  it("propaga error de Mobbex (500/400)", async () => {
    (axios as any).post.mockRejectedValue(new Error("Mobbex 500"));
    const svc = new MobbexPaymentService();
    await expect(svc.createPaymentLink(baseOrder)).rejects.toThrow("Mobbex 500");
  });
});

describe("MobbexPaymentService.verifyWebhook", () => {
  it("re-consulta la operación y devuelve PaymentEvent normalizado (approved)", async () => {
    (axios as any).get.mockResolvedValue(opResponse(200));
    const svc = new MobbexPaymentService();
    const ev = await svc.verifyWebhook(
      { data: { payment: { id: "MBX-999" } } },
      ""
    );
    expect(ev).toEqual({
      orderId: "order-uuid-1",
      paymentId: "MBX-999",
      status: "approved",
      amount: 10000,
    });
    // No confiamos en el body: el estado sale del GET a la API.
    const [url] = (axios as any).get.mock.calls[0];
    expect(url).toContain("/p/operations/MBX-999");
  });

  it.each([
    [3, "rejected"],
    [400, "rejected"],
    [401, "cancelled"],
    [2, "pending"],
    [300, "pending"],
    [601, "refunded"],
    [602, "charged_back"],
    [999, "pending"], // desconocido → no-op
  ])("mapea código %i → %s", async (code, expected) => {
    (axios as any).get.mockResolvedValue(opResponse(code as number));
    const svc = new MobbexPaymentService();
    const ev = await svc.verifyWebhook(
      { data: { payment: { id: "MBX-999" } } },
      ""
    );
    expect(ev.status).toBe(expected);
  });

  it("lanza si falta payment id en el payload", async () => {
    const svc = new MobbexPaymentService();
    await expect(svc.verifyWebhook({}, "")).rejects.toThrow(/Missing payment id/);
  });

  it("propaga error si Mobbex devuelve 404 (id inexistente)", async () => {
    (axios as any).get.mockRejectedValue(new Error("404 Not Found"));
    const svc = new MobbexPaymentService();
    await expect(
      svc.verifyWebhook({ data: { payment: { id: "ghost" } } }, "")
    ).rejects.toThrow();
  });
});

describe("MobbexPaymentService.refund", () => {
  it("GET al endpoint de refund de la operación", async () => {
    (axios as any).get.mockResolvedValue({ data: { result: true } });
    const svc = new MobbexPaymentService();
    await svc.refund("MBX-1", 5000);
    const [url] = (axios as any).get.mock.calls[0];
    expect(url).toContain("/p/operations/MBX-1/refund");
  });
});
