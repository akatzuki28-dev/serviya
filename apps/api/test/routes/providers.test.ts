import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { makeFakeDb, chain } from "../helpers/db";
import { bearer } from "../helpers/auth";

const fakeDb = makeFakeDb();
vi.mock("@sp/db", () => ({
  getDb: () => fakeDb,
  schema: { providers: { id: "id", isActive: "isActive" }, orders: { providerId: "providerId" } },
}));

import { providersRouter } from "../../src/routes/providers";

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/providers", providersRouter);
  return app;
}

describe("providersRouter", () => {
  beforeEach(() => {
    fakeDb.query.providers.findMany.mockReset();
    fakeDb.insert.mockReset();
    fakeDb.update.mockReset();
  });

  // GET / es público
  it("GET / lista solo proveedores activos", async () => {
    fakeDb.query.providers.findMany.mockResolvedValue([{ id: "p1" }]);
    const res = await request(makeApp()).get("/api/providers");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: "p1" }]);
  });

  // POST requiere ADMIN
  it("POST 401 sin token", async () => {
    const res = await request(makeApp()).post("/api/providers").send({ name: "X" });
    expect(res.status).toBe(401);
  });

  it("POST 403 si el rol es CLIENT", async () => {
    const res = await request(makeApp())
      .post("/api/providers")
      .set("Authorization", bearer({ id: "u1", role: "CLIENT" }))
      .send({ name: "X" });
    expect(res.status).toBe(403);
  });

  it("POST 400 si name vacío", async () => {
    const res = await request(makeApp())
      .post("/api/providers")
      .set("Authorization", bearer({ id: "u1", role: "ADMIN" }))
      .send({ name: "" });
    expect(res.status).toBe(400);
  });

  it("POST 201 crea proveedor (admin)", async () => {
    fakeDb.insert.mockReturnValue(chain([{ id: "p1", name: "Juan" }]));
    const res = await request(makeApp())
      .post("/api/providers")
      .set("Authorization", bearer({ id: "u1", role: "ADMIN" }))
      .send({ name: "Juan", serviceCategories: ["limpieza"] });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe("p1");
  });

  it("PATCH 404 si proveedor inexistente", async () => {
    fakeDb.update.mockReturnValue(chain([]));
    const res = await request(makeApp())
      .patch("/api/providers/ghost")
      .set("Authorization", bearer({ id: "u1", role: "ADMIN" }))
      .send({ isActive: false });
    expect(res.status).toBe(404);
  });

  it("GET /:id/orders requiere PROVIDER o ADMIN", async () => {
    const res = await request(makeApp())
      .get("/api/providers/p1/orders")
      .set("Authorization", bearer({ id: "c1", role: "CLIENT" }));
    expect(res.status).toBe(403);
  });
});
