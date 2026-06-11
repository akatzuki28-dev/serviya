import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { makeFakeDb, chain } from "../helpers/db";
import { bearer } from "../helpers/auth";

const fakeDb = makeFakeDb();
// getDb: () => fakeDb es una referencia LAZY (se lee al invocar getDb), por eso
// fakeDb puede quedar como const normal. Los demás mocks referencian sus fns de
// forma EAGER dentro de la factory, así que van por vi.hoisted (si no, TDZ error
// al hoistearse la factory arriba de las declaraciones).
vi.mock("@sp/db", () => ({
  getDb: () => fakeDb,
  schema: {
    users: { email: "email", id: "id" },
    orders: { id: "id", userId: "userId", providerId: "providerId", createdAt: "createdAt" },
    orderStatusHistory: {},
  },
}));

const { quoteMock, createPaymentLinkMock, notifyPaymentLink } = vi.hoisted(() => ({
  quoteMock: vi.fn(),
  createPaymentLinkMock: vi.fn(),
  notifyPaymentLink: vi.fn(),
}));

vi.mock("../../src/services/PricingService", () => ({
  PricingService: { quote: quoteMock },
}));

vi.mock("../../src/services/payment/MPPersonalPaymentService", () => ({
  MPPersonalPaymentService: class {
    createPaymentLink = createPaymentLinkMock;
  },
}));

vi.mock("../../src/services/NotificationService", () => ({
  NotificationService: { paymentLink: notifyPaymentLink },
}));

import { ordersRouter } from "../../src/routes/orders";

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/orders", ordersRouter);
  return app;
}

const validBody = {
  serviceType: "limpieza",
  scheduledAt: "2026-12-01T10:00:00.000Z",
  paymentMethod: "mp_link" as const,
  guestEmail: "ana@example.com",
  guestPhone: "5491133334444",
  addressSnapshot: { street: "Av 1", city: "BA" },
};

beforeEach(() => {
  Object.values(fakeDb.query.orders).forEach((m: any) => m.mockReset?.());
  fakeDb.insert.mockReset();
  fakeDb.update.mockReset();
  quoteMock.mockReset();
  createPaymentLinkMock.mockReset();
  notifyPaymentLink.mockReset();
});

describe("POST /api/orders — booking", () => {
  // ── HAPPY PATHS ─────────────────────────────────────────────────────────
  it("201 guest booking con mp_link: crea user, orden, status history, preference y envía WA", async () => {
    quoteMock.mockResolvedValue({
      total: 10000, platformFee: 1500, netToProvider: 8500,
      basePrice: 10000, extrasTotal: 0, breakdown: [],
    });
    fakeDb.insert
      // 1. INSERT users (guest) .onConflictDoUpdate.returning
      .mockReturnValueOnce(chain([{ id: "user-guest-1" }]))
      // 2. INSERT orders .returning
      .mockReturnValueOnce(chain([{ id: "order-1", userId: "user-guest-1" }]))
      // 3. INSERT orderStatusHistory
      .mockReturnValueOnce(chain(undefined));
    fakeDb.update.mockReturnValue(chain([]));
    createPaymentLinkMock.mockResolvedValue({ url: "https://mp/p/1", externalId: "PREF-1" });

    const res = await request(makeApp()).post("/api/orders").send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.order.id).toBe("order-1");
    expect(res.body.paymentUrl).toBe("https://mp/p/1");
    expect(createPaymentLinkMock).toHaveBeenCalledOnce();
    expect(notifyPaymentLink).toHaveBeenCalledWith(
      "5491133334444",
      "ana",
      "limpieza",
      "https://mp/p/1",
      "48 horas"
    );
  });

  it("201 con paymentMethod=transfer no llama a MP ni notifica payment link", async () => {
    quoteMock.mockResolvedValue({
      total: 5000, platformFee: 750, netToProvider: 4250,
      basePrice: 5000, extrasTotal: 0, breakdown: [],
    });
    fakeDb.insert
      .mockReturnValueOnce(chain([{ id: "u" }]))
      .mockReturnValueOnce(chain([{ id: "o" }]))
      .mockReturnValueOnce(chain(undefined));

    const res = await request(makeApp())
      .post("/api/orders")
      .send({ ...validBody, paymentMethod: "transfer" });

    expect(res.status).toBe(201);
    expect(res.body.paymentUrl).toBeNull();
    expect(createPaymentLinkMock).not.toHaveBeenCalled();
    expect(notifyPaymentLink).not.toHaveBeenCalled();
  });

  // ── VALIDATION ──────────────────────────────────────────────────────────
  it.each([
    ["serviceType faltante", { ...validBody, serviceType: undefined }],
    ["scheduledAt no ISO", { ...validBody, scheduledAt: "mañana" }],
    ["paymentMethod inválido", { ...validBody, paymentMethod: "cash" }],
    ["guestEmail mal formado", { ...validBody, guestEmail: "no-mail" }],
    ["clientNotes > 500 chars", { ...validBody, clientNotes: "x".repeat(501) }],
    ["addressId no UUID", { ...validBody, addressId: "abc" }],
  ])("400 cuando %s", async (_label, body) => {
    const res = await request(makeApp()).post("/api/orders").send(body);
    expect(res.status).toBe(400);
  });

  // ── FAILURE / EDGE ──────────────────────────────────────────────────────
  it("500 si PricingService.quote falla", async () => {
    quoteMock.mockRejectedValue(new Error("DB down"));
    const res = await request(makeApp()).post("/api/orders").send(validBody);
    expect(res.status).toBe(500);
  });

  it("500 si createPaymentLink falla → no debe romper response con dos 'res.json'", async () => {
    quoteMock.mockResolvedValue({
      total: 1000, platformFee: 150, netToProvider: 850,
      basePrice: 1000, extrasTotal: 0, breakdown: [],
    });
    fakeDb.insert
      .mockReturnValueOnce(chain([{ id: "u" }]))
      .mockReturnValueOnce(chain([{ id: "o" }]))
      .mockReturnValueOnce(chain(undefined));
    createPaymentLinkMock.mockRejectedValue(new Error("MP timeout"));
    const res = await request(makeApp()).post("/api/orders").send(validBody);
    expect(res.status).toBe(500);
  });

  it("no notifica por WA si no se proveyó guestPhone aunque sí paymentUrl", async () => {
    quoteMock.mockResolvedValue({
      total: 1000, platformFee: 150, netToProvider: 850,
      basePrice: 1000, extrasTotal: 0, breakdown: [],
    });
    fakeDb.insert
      .mockReturnValueOnce(chain([{ id: "u" }]))
      .mockReturnValueOnce(chain([{ id: "o" }]))
      .mockReturnValueOnce(chain(undefined));
    fakeDb.update.mockReturnValue(chain([]));
    createPaymentLinkMock.mockResolvedValue({ url: "u", externalId: "x" });

    const { guestPhone: _drop, ...noPhone } = validBody;
    await request(makeApp()).post("/api/orders").send(noPhone);
    expect(notifyPaymentLink).not.toHaveBeenCalled();
  });
});

describe("GET /api/orders/:id — RLS", () => {
  it("401 sin token", async () => {
    const res = await request(makeApp()).get("/api/orders/o1");
    expect(res.status).toBe(401);
  });

  it("404 si no existe", async () => {
    fakeDb.query.orders.findFirst.mockResolvedValue(undefined);
    const res = await request(makeApp())
      .get("/api/orders/o-ghost")
      .set("Authorization", bearer({ id: "u1" }));
    expect(res.status).toBe(404);
  });

  it("403 si el user no es dueño, ni provider asignado, ni admin", async () => {
    fakeDb.query.orders.findFirst.mockResolvedValue({
      id: "o1", userId: "owner", providerId: "prov",
    });
    const res = await request(makeApp())
      .get("/api/orders/o1")
      .set("Authorization", bearer({ id: "stranger" }));
    expect(res.status).toBe(403);
  });

  it("200 si es el owner", async () => {
    fakeDb.query.orders.findFirst.mockResolvedValue({
      id: "o1", userId: "owner",
    });
    const res = await request(makeApp())
      .get("/api/orders/o1")
      .set("Authorization", bearer({ id: "owner" }));
    expect(res.status).toBe(200);
  });

  it("200 si es ADMIN aunque no sea dueño", async () => {
    fakeDb.query.orders.findFirst.mockResolvedValue({
      id: "o1", userId: "x", providerId: "y",
    });
    const res = await request(makeApp())
      .get("/api/orders/o1")
      .set("Authorization", bearer({ id: "ad", role: "ADMIN" }));
    expect(res.status).toBe(200);
  });
});

describe("PATCH /api/orders/:id/status — máquina de estados", () => {
  it("rechaza estados fuera del enum", async () => {
    const res = await request(makeApp())
      .patch("/api/orders/o1/status")
      .set("Authorization", bearer({ id: "ad", role: "ADMIN" }))
      .send({ status: "INVENTED" });
    // safeParse → 400 con el detalle del zod flatten.
    expect(res.status).toBe(400);
  });

  it("404 si la orden no existe", async () => {
    fakeDb.update.mockReturnValue(chain([]));
    const res = await request(makeApp())
      .patch("/api/orders/ghost/status")
      .set("Authorization", bearer({ id: "ad", role: "ADMIN" }))
      .send({ status: "COMPLETADA" });
    expect(res.status).toBe(404);
  });

  it("200 actualiza y registra historial con changedBy=admin", async () => {
    fakeDb.update.mockReturnValue(chain([{ id: "o1", status: "COMPLETADA" }]));
    fakeDb.insert.mockReturnValue(chain(undefined));
    const res = await request(makeApp())
      .patch("/api/orders/o1/status")
      .set("Authorization", bearer({ id: "ad", role: "ADMIN" }))
      .send({ status: "COMPLETADA" });
    expect(res.status).toBe(200);
    expect(fakeDb.insert).toHaveBeenCalled();
  });
});

describe("GET /api/orders — solo ADMIN", () => {
  it("403 si rol != ADMIN", async () => {
    const res = await request(makeApp())
      .get("/api/orders")
      .set("Authorization", bearer({ id: "u1", role: "CLIENT" }));
    expect(res.status).toBe(403);
  });

  it("200 ADMIN lista órdenes (limit 100)", async () => {
    fakeDb.query.orders.findMany.mockResolvedValue([{ id: "o1" }]);
    const res = await request(makeApp())
      .get("/api/orders")
      .set("Authorization", bearer({ id: "ad", role: "ADMIN" }));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: "o1" }]);
  });
});
