import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

// vi.hoisted corre ANTES que los imports y que las factories de vi.mock (que
// Vitest también hoistea). Definir los mocks acá evita el "Cannot access X
// before initialization": cuando las factories de abajo se evalúan, estas
// referencias ya están inicializadas.
const { fakeDb, verifyWebhookMock, orderConfirmedMock, chain } = vi.hoisted(() => {
  // chain mínimo (no podemos importar el helper dentro de vi.hoisted): objeto
  // thenable que se auto-referencia para cualquier método encadenado de Drizzle.
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
    orders: { id: "id", status: "status", mpPaymentId: "mpPaymentId" },
    orderStatusHistory: {},
    providerPayouts: {},
    users: { id: "id" },
  },
}));

vi.mock("../../../src/services/payment/MPPersonalPaymentService", () => ({
  MPPersonalPaymentService: class {
    verifyWebhook = verifyWebhookMock;
  },
}));

vi.mock("../../../src/services/NotificationService", () => ({
  NotificationService: { orderConfirmed: orderConfirmedMock },
}));

// Bypass HMAC en estos tests: el middleware es testeado aparte.
vi.mock("../../../src/middlewares/validateWebhook", () => ({
  validateMPWebhook: (_req: any, _res: any, next: any) => next(),
  validateWhatsAppWebhook: (_req: any, _res: any, next: any) => next(),
}));

import { mpWebhookRouter } from "../../../src/routes/webhooks/mp";

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/webhooks/mp", mpWebhookRouter);
  return app;
}

// Espera a que termine el procesamiento async (el handler responde 200 antes).
const tick = () => new Promise((r) => setTimeout(r, 20));

beforeEach(() => {
  fakeDb.query.orders.findFirst.mockReset();
  fakeDb.query.users.findFirst.mockReset();
  fakeDb.insert.mockReset().mockReturnValue(chain([]));
  fakeDb.update.mockReset().mockReturnValue(chain([{ id: "o1" }]));
  verifyWebhookMock.mockReset();
  orderConfirmedMock.mockReset();
});

describe("POST /api/webhooks/mp", () => {
  it("responde 200 inmediatamente, antes de procesar", async () => {
    verifyWebhookMock.mockResolvedValue({
      orderId: "o1", paymentId: "p1", status: "approved", amount: 100,
    });
    fakeDb.query.orders.findFirst.mockResolvedValue({
      id: "o1", status: "PENDIENTE_PAGO", userId: null, providerId: null,
    });

    const res = await request(makeApp())
      .post("/api/webhooks/mp?topic=payment")
      .send({ type: "payment", data: { id: "p1" } });

    expect(res.status).toBe(200);
    expect(res.text).toBe("OK");
  });

  it("ignora notificaciones que no son de payment", async () => {
    const res = await request(makeApp())
      .post("/api/webhooks/mp?topic=merchant_order")
      .send({ type: "merchant_order" });
    expect(res.status).toBe(200);
    expect(verifyWebhookMock).not.toHaveBeenCalled();
  });

  it("approved sobre PENDIENTE_PAGO → PAGADA + history, sin crear payout", async () => {
    verifyWebhookMock.mockResolvedValue({
      orderId: "o1", paymentId: "p1", status: "approved", amount: 100,
    });
    fakeDb.query.orders.findFirst.mockResolvedValue({
      id: "o1", status: "PENDIENTE_PAGO", userId: "u1", providerId: null, provider: null,
    });
    fakeDb.update.mockReturnValue(chain([{ id: "o1" }])); // 1 fila actualizada

    await request(makeApp())
      .post("/api/webhooks/mp?topic=payment")
      .send({ type: "payment", data: { id: "p1" } });
    await tick();

    expect(fakeDb.update).toHaveBeenCalled();
    // Un solo insert: el status history. El payout YA NO se crea acá.
    expect(fakeDb.insert).toHaveBeenCalledTimes(1);
  });

  it("approved con proveedor asignado → notifica al cliente", async () => {
    verifyWebhookMock.mockResolvedValue({
      orderId: "o1", paymentId: "p1", status: "approved", amount: 100,
    });
    fakeDb.query.orders.findFirst.mockResolvedValue({
      id: "o1", status: "PENDIENTE_PAGO", userId: "u1", providerId: "prov-1",
      provider: { name: "Juan" },
    });
    fakeDb.query.users.findFirst.mockResolvedValue({ phone: "5491133334444" });
    fakeDb.update.mockReturnValue(chain([{ id: "o1" }]));

    await request(makeApp())
      .post("/api/webhooks/mp?topic=payment")
      .send({ type: "payment", data: { id: "p1" } });
    await tick();

    expect(orderConfirmedMock).toHaveBeenCalledWith(
      expect.anything(),
      "5491133334444",
      "Juan"
    );
  });

  it("approved SIN proveedor → no notifica (sin placeholder)", async () => {
    verifyWebhookMock.mockResolvedValue({
      orderId: "o1", paymentId: "p1", status: "approved", amount: 100,
    });
    fakeDb.query.orders.findFirst.mockResolvedValue({
      id: "o1", status: "PENDIENTE_PAGO", userId: "u1", providerId: null, provider: null,
    });
    fakeDb.query.users.findFirst.mockResolvedValue({ phone: "5491133334444" });
    fakeDb.update.mockReturnValue(chain([{ id: "o1" }]));

    await request(makeApp())
      .post("/api/webhooks/mp?topic=payment")
      .send({ type: "payment", data: { id: "p1" } });
    await tick();

    expect(orderConfirmedMock).not.toHaveBeenCalled();
  });

  it("idempotencia: approved duplicado (UPDATE condicional matchea 0 filas) → no inserta history", async () => {
    verifyWebhookMock.mockResolvedValue({
      orderId: "o1", paymentId: "p1", status: "approved", amount: 100,
    });
    // La orden ya está PAGADA por el primer webhook.
    fakeDb.query.orders.findFirst.mockResolvedValue({ id: "o1", status: "PAGADA" });
    fakeDb.update.mockReturnValue(chain([])); // 0 filas: el WHERE status=PENDIENTE_PAGO no matchea

    await request(makeApp())
      .post("/api/webhooks/mp?topic=payment")
      .send({ type: "payment", data: { id: "p1" } });
    await tick();

    expect(fakeDb.insert).not.toHaveBeenCalled();
    expect(orderConfirmedMock).not.toHaveBeenCalled();
  });

  it("approved tardío sobre CANCELADA → no pisa el estado", async () => {
    verifyWebhookMock.mockResolvedValue({
      orderId: "o1", paymentId: "p1", status: "approved", amount: 100,
    });
    fakeDb.query.orders.findFirst.mockResolvedValue({ id: "o1", status: "CANCELADA" });
    fakeDb.update.mockReturnValue(chain([])); // 0 filas

    await request(makeApp())
      .post("/api/webhooks/mp?topic=payment")
      .send({ type: "payment", data: { id: "p1" } });
    await tick();

    expect(fakeDb.insert).not.toHaveBeenCalled();
  });

  it("rejected → PAGO_FALLIDO con history, sin notificar", async () => {
    verifyWebhookMock.mockResolvedValue({
      orderId: "o1", paymentId: "p2", status: "rejected", amount: 100,
    });
    fakeDb.query.orders.findFirst.mockResolvedValue({
      id: "o1", status: "PENDIENTE_PAGO", userId: "u1", providerId: "prov",
    });
    fakeDb.update.mockReturnValue(chain([{ id: "o1" }]));

    await request(makeApp())
      .post("/api/webhooks/mp?topic=payment")
      .send({ type: "payment", data: { id: "p2" } });
    await tick();

    expect(fakeDb.insert).toHaveBeenCalledTimes(1); // solo status history
    expect(orderConfirmedMock).not.toHaveBeenCalled();
  });

  it("refunded sobre orden pagada → REEMBOLSADA con history", async () => {
    verifyWebhookMock.mockResolvedValue({
      orderId: "o1", paymentId: "p1", status: "refunded", amount: 100,
    });
    fakeDb.query.orders.findFirst.mockResolvedValue({ id: "o1", status: "PAGADA" });
    fakeDb.update.mockReturnValue(chain([{ id: "o1" }]));

    await request(makeApp())
      .post("/api/webhooks/mp?topic=payment")
      .send({ type: "payment", data: { id: "p1" } });
    await tick();

    expect(fakeDb.update).toHaveBeenCalled();
    expect(fakeDb.insert).toHaveBeenCalledTimes(1);
  });

  it("charged_back sobre orden NO pagada (PENDIENTE_PAGO) → ignora", async () => {
    verifyWebhookMock.mockResolvedValue({
      orderId: "o1", paymentId: "p1", status: "charged_back", amount: 100,
    });
    fakeDb.query.orders.findFirst.mockResolvedValue({ id: "o1", status: "PENDIENTE_PAGO" });
    fakeDb.update.mockReturnValue(chain([])); // 0 filas: PENDIENTE_PAGO no está en PAID_STATES

    await request(makeApp())
      .post("/api/webhooks/mp?topic=payment")
      .send({ type: "payment", data: { id: "p1" } });
    await tick();

    expect(fakeDb.insert).not.toHaveBeenCalled();
  });

  it("orphan payment: order no encontrada → loguea y termina sin throw", async () => {
    verifyWebhookMock.mockResolvedValue({
      orderId: "o-ghost", paymentId: "p", status: "approved", amount: 1,
    });
    fakeDb.query.orders.findFirst.mockResolvedValue(undefined);
    const res = await request(makeApp())
      .post("/api/webhooks/mp?topic=payment")
      .send({ type: "payment", data: { id: "p" } });
    expect(res.status).toBe(200);
  });

  it("status=pending → no muta estado", async () => {
    verifyWebhookMock.mockResolvedValue({
      orderId: "o1", paymentId: "p", status: "pending", amount: 1,
    });
    fakeDb.query.orders.findFirst.mockResolvedValue({ id: "o1", status: "PENDIENTE_PAGO" });
    await request(makeApp())
      .post("/api/webhooks/mp?topic=payment")
      .send({ type: "payment", data: { id: "p" } });
    await tick();
    expect(fakeDb.update).not.toHaveBeenCalled();
  });
});
