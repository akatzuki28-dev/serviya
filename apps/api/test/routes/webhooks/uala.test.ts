import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

const { fakeDb, verifyWebhookMock, orderConfirmedMock, chain } = vi.hoisted(() => {
  const chain = (result: unknown): any => {
    const proxy: any = new Proxy(
      {
        then: (f: any, r: any) => Promise.resolve(result).then(f, r),
        catch: (r: any) => Promise.resolve(result).catch(r),
        finally: (f: any) => Promise.resolve(result).finally(f),
      },
      { get: (t, p) => (p in t ? (t as any)[p] : () => proxy) }
    );
    return proxy;
  };

  const fakeDb = {
    insert: vi.fn(() => chain([])),
    update: vi.fn(() => chain([])),
    delete: vi.fn(() => chain(undefined)),
    select: vi.fn(() => chain([])),
    query: {
      orders: { findFirst: vi.fn(), findMany: vi.fn() },
      users: { findFirst: vi.fn(), findMany: vi.fn() },
      providers: { findFirst: vi.fn(), findMany: vi.fn() },
    },
  };

  return { fakeDb, verifyWebhookMock: vi.fn(), orderConfirmedMock: vi.fn(), chain };
});

vi.mock("@sp/db", () => ({
  getDb: () => fakeDb,
  schema: {
    orders: {
      id: "id",
      status: "status",
      gatewayPaymentId: "gatewayPaymentId",
      paymentProvider: "paymentProvider",
    },
    orderStatusHistory: {},
    providerPayouts: {},
    users: { id: "id" },
  },
}));

vi.mock("../../../src/services/payment/UalaBisPaymentService", () => ({
  UalaBisPaymentService: class {
    verifyWebhook = verifyWebhookMock;
  },
}));

vi.mock("../../../src/services/NotificationService", () => ({
  NotificationService: { orderConfirmed: orderConfirmedMock },
}));

// Bypass del secreto en estos tests: el middleware se testea aparte.
vi.mock("../../../src/middlewares/validateWebhook", () => ({
  validateUalaWebhook: (_req: any, _res: any, next: any) => next(),
}));

import { ualaWebhookRouter } from "../../../src/routes/webhooks/uala";

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/webhooks/uala", ualaWebhookRouter);
  return app;
}

const tick = () => new Promise((r) => setTimeout(r, 20));

beforeEach(() => {
  fakeDb.query.orders.findFirst.mockReset();
  fakeDb.query.users.findFirst.mockReset();
  fakeDb.insert.mockReset().mockReturnValue(chain([]));
  fakeDb.update.mockReset().mockReturnValue(chain([{ id: "o1" }]));
  verifyWebhookMock.mockReset();
  orderConfirmedMock.mockReset();
});

describe("POST /api/webhooks/uala", () => {
  it("responde 200 inmediatamente, antes de procesar", async () => {
    verifyWebhookMock.mockResolvedValue({
      orderId: "o1", paymentId: "U1", status: "approved", amount: 100,
    });
    fakeDb.query.orders.findFirst.mockResolvedValue({
      id: "o1", status: "PENDIENTE_PAGO", userId: null, providerId: null,
    });

    const res = await request(makeApp())
      .post("/api/webhooks/uala")
      .send({ uuid: "U1", status: "APPROVED" });

    expect(res.status).toBe(200);
    expect(res.text).toBe("OK");
  });

  it("approved sobre PENDIENTE_PAGO → PAGADA + history, sin crear payout", async () => {
    verifyWebhookMock.mockResolvedValue({
      orderId: "o1", paymentId: "U1", status: "approved", amount: 100,
    });
    fakeDb.query.orders.findFirst.mockResolvedValue({
      id: "o1", status: "PENDIENTE_PAGO", userId: "u1", providerId: null, provider: null,
    });
    fakeDb.update.mockReturnValue(chain([{ id: "o1" }]));

    await request(makeApp()).post("/api/webhooks/uala").send({ uuid: "U1" });
    await tick();

    expect(fakeDb.update).toHaveBeenCalled();
    expect(fakeDb.insert).toHaveBeenCalledTimes(1); // solo status history
  });

  it("approved con proveedor asignado → notifica al cliente", async () => {
    verifyWebhookMock.mockResolvedValue({
      orderId: "o1", paymentId: "U1", status: "approved", amount: 100,
    });
    fakeDb.query.orders.findFirst.mockResolvedValue({
      id: "o1", status: "PENDIENTE_PAGO", userId: "u1", providerId: "prov-1",
      provider: { name: "Juan" },
    });
    fakeDb.query.users.findFirst.mockResolvedValue({ phone: "5491133334444" });
    fakeDb.update.mockReturnValue(chain([{ id: "o1" }]));

    await request(makeApp()).post("/api/webhooks/uala").send({ uuid: "U1" });
    await tick();

    expect(orderConfirmedMock).toHaveBeenCalledWith(
      expect.anything(),
      "5491133334444",
      "Juan"
    );
  });

  it("approved SIN proveedor → no notifica (sin placeholder)", async () => {
    verifyWebhookMock.mockResolvedValue({
      orderId: "o1", paymentId: "U1", status: "approved", amount: 100,
    });
    fakeDb.query.orders.findFirst.mockResolvedValue({
      id: "o1", status: "PENDIENTE_PAGO", userId: "u1", providerId: null, provider: null,
    });
    fakeDb.query.users.findFirst.mockResolvedValue({ phone: "5491133334444" });
    fakeDb.update.mockReturnValue(chain([{ id: "o1" }]));

    await request(makeApp()).post("/api/webhooks/uala").send({ uuid: "U1" });
    await tick();

    expect(orderConfirmedMock).not.toHaveBeenCalled();
  });

  it("idempotencia: approved duplicado (UPDATE matchea 0 filas) → no inserta history", async () => {
    verifyWebhookMock.mockResolvedValue({
      orderId: "o1", paymentId: "U1", status: "approved", amount: 100,
    });
    fakeDb.query.orders.findFirst.mockResolvedValue({ id: "o1", status: "PAGADA" });
    fakeDb.update.mockReturnValue(chain([])); // 0 filas

    await request(makeApp()).post("/api/webhooks/uala").send({ uuid: "U1" });
    await tick();

    expect(fakeDb.insert).not.toHaveBeenCalled();
    expect(orderConfirmedMock).not.toHaveBeenCalled();
  });

  it("approved tardío sobre CANCELADA → no pisa el estado", async () => {
    verifyWebhookMock.mockResolvedValue({
      orderId: "o1", paymentId: "U1", status: "approved", amount: 100,
    });
    fakeDb.query.orders.findFirst.mockResolvedValue({ id: "o1", status: "CANCELADA" });
    fakeDb.update.mockReturnValue(chain([]));

    await request(makeApp()).post("/api/webhooks/uala").send({ uuid: "U1" });
    await tick();

    expect(fakeDb.insert).not.toHaveBeenCalled();
  });

  it("rejected → PAGO_FALLIDO con history, sin notificar", async () => {
    verifyWebhookMock.mockResolvedValue({
      orderId: "o1", paymentId: "U2", status: "rejected", amount: 100,
    });
    fakeDb.query.orders.findFirst.mockResolvedValue({
      id: "o1", status: "PENDIENTE_PAGO", userId: "u1", providerId: "prov",
    });
    fakeDb.update.mockReturnValue(chain([{ id: "o1" }]));

    await request(makeApp()).post("/api/webhooks/uala").send({ uuid: "U2" });
    await tick();

    expect(fakeDb.insert).toHaveBeenCalledTimes(1);
    expect(orderConfirmedMock).not.toHaveBeenCalled();
  });

  it("refunded sobre orden pagada → REEMBOLSADA con history", async () => {
    verifyWebhookMock.mockResolvedValue({
      orderId: "o1", paymentId: "U1", status: "refunded", amount: 100,
    });
    fakeDb.query.orders.findFirst.mockResolvedValue({ id: "o1", status: "PAGADA" });
    fakeDb.update.mockReturnValue(chain([{ id: "o1" }]));

    await request(makeApp()).post("/api/webhooks/uala").send({ uuid: "U1" });
    await tick();

    expect(fakeDb.update).toHaveBeenCalled();
    expect(fakeDb.insert).toHaveBeenCalledTimes(1);
  });

  it("orphan order: no encontrada → loguea y termina sin throw", async () => {
    verifyWebhookMock.mockResolvedValue({
      orderId: "o-ghost", paymentId: "U", status: "approved", amount: 1,
    });
    fakeDb.query.orders.findFirst.mockResolvedValue(undefined);
    const res = await request(makeApp())
      .post("/api/webhooks/uala")
      .send({ uuid: "U" });
    expect(res.status).toBe(200);
  });

  it("status=pending → no muta estado", async () => {
    verifyWebhookMock.mockResolvedValue({
      orderId: "o1", paymentId: "U", status: "pending", amount: 1,
    });
    fakeDb.query.orders.findFirst.mockResolvedValue({ id: "o1", status: "PENDIENTE_PAGO" });
    await request(makeApp()).post("/api/webhooks/uala").send({ uuid: "U" });
    await tick();
    expect(fakeDb.update).not.toHaveBeenCalled();
  });

  it("GET de verificación de URL → 200 OK", async () => {
    const res = await request(makeApp()).get("/api/webhooks/uala");
    expect(res.status).toBe(200);
    expect(res.text).toBe("OK");
  });

  it("payload sin uuid (verifyWebhook lanza) → 200 y no toca DB", async () => {
    verifyWebhookMock.mockRejectedValue(new Error("Missing uuid"));
    const res = await request(makeApp()).post("/api/webhooks/uala").send({});
    await tick();
    expect(res.status).toBe(200);
    expect(fakeDb.update).not.toHaveBeenCalled();
  });
});
