import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { makeFakeDb, chain } from "../helpers/db";
import { bearer } from "../helpers/auth";

const fakeDb = makeFakeDb();
vi.mock("@sp/db", () => ({
  getDb: () => fakeDb,
  schema: {
    orders: { userId: "userId", createdAt: "createdAt" },
    userAddresses: { userId: "userId", id: "id" },
  },
}));

import { usersRouter } from "../../src/routes/users";

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/users", usersRouter);
  return app;
}

describe("usersRouter", () => {
  beforeEach(() => {
    fakeDb.query.orders.findMany.mockReset();
    fakeDb.query.userAddresses.findMany.mockReset();
    fakeDb.insert.mockReset();
    fakeDb.update.mockReset();
    fakeDb.delete.mockReset();
  });

  // ── GET /:id/orders ─────────────────────────────────────────────────────
  it("GET /:id/orders 401 sin token", async () => {
    const res = await request(makeApp()).get("/api/users/u1/orders");
    expect(res.status).toBe(401);
  });

  it("GET /:id/orders 403 si otro usuario y no es admin", async () => {
    const res = await request(makeApp())
      .get("/api/users/u1/orders")
      .set("Authorization", bearer({ id: "u2", role: "CLIENT" }));
    expect(res.status).toBe(403);
  });

  it("GET /:id/orders 200 si es el propio usuario", async () => {
    fakeDb.query.orders.findMany.mockResolvedValue([{ id: "o1" }]);
    const res = await request(makeApp())
      .get("/api/users/u1/orders")
      .set("Authorization", bearer({ id: "u1", role: "CLIENT" }));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: "o1" }]);
  });

  it("GET /:id/orders 200 si ADMIN consulta de otro user", async () => {
    fakeDb.query.orders.findMany.mockResolvedValue([]);
    const res = await request(makeApp())
      .get("/api/users/u1/orders")
      .set("Authorization", bearer({ id: "admin1", role: "ADMIN" }));
    expect(res.status).toBe(200);
  });

  // ── POST /:id/addresses ─────────────────────────────────────────────────
  it("POST address 403 si user distinto (admin tampoco puede crearle direcciones a terceros)", async () => {
    const res = await request(makeApp())
      .post("/api/users/u1/addresses")
      .set("Authorization", bearer({ id: "admin1", role: "ADMIN" }))
      .send({ street: "Av", city: "BA" });
    expect(res.status).toBe(403);
  });

  it("POST address 400 si payload inválido", async () => {
    const res = await request(makeApp())
      .post("/api/users/u1/addresses")
      .set("Authorization", bearer({ id: "u1", role: "CLIENT" }))
      .send({ street: "", city: "" });
    expect(res.status).toBe(400);
  });

  it("POST address 201 crea y, si isDefault, resetea las demás", async () => {
    fakeDb.insert.mockReturnValue(chain([{ id: "a1", isDefault: true }]));
    fakeDb.update.mockReturnValue(chain([]));
    const res = await request(makeApp())
      .post("/api/users/u1/addresses")
      .set("Authorization", bearer({ id: "u1", role: "CLIENT" }))
      .send({ street: "Av 1", city: "BA", isDefault: true });
    expect(res.status).toBe(201);
    expect(fakeDb.update).toHaveBeenCalled();
  });

  // ── DELETE ──────────────────────────────────────────────────────────────
  it("DELETE address 204 happy path", async () => {
    fakeDb.delete.mockReturnValue(chain(undefined));
    const res = await request(makeApp())
      .delete("/api/users/u1/addresses/a1")
      .set("Authorization", bearer({ id: "u1", role: "CLIENT" }));
    expect(res.status).toBe(204);
  });

  it("DELETE address 403 user distinto", async () => {
    const res = await request(makeApp())
      .delete("/api/users/u1/addresses/a1")
      .set("Authorization", bearer({ id: "u2", role: "CLIENT" }));
    expect(res.status).toBe(403);
  });
});
