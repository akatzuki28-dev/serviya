import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { makeFakeDb } from "../helpers/db";

const fakeDb = makeFakeDb();
vi.mock("@sp/db", () => ({
  getDb: () => fakeDb,
  schema: { servicePricing: { serviceType: "serviceType", zone: "zone" } },
}));

import { servicesRouter } from "../../src/routes/services";

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/services", servicesRouter);
  return app;
}

describe("GET /api/services", () => {
  beforeEach(() => fakeDb.query.servicePricing.findMany.mockReset());

  it("retorna catálogo con slug, nombre formateado y precio base", async () => {
    fakeDb.query.servicePricing.findMany.mockResolvedValue([
      { serviceType: "limpieza-profunda", basePrice: "10000", extras: [] },
      { serviceType: "plomeria", basePrice: "5000", extras: [{ id: "x" }] },
    ]);
    const res = await request(makeApp()).get("/api/services");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        slug: "limpieza-profunda",
        name: "Limpieza Profunda",
        basePrice: 10000,
        extras: [],
      },
      { slug: "plomeria", name: "Plomeria", basePrice: 5000, extras: [{ id: "x" }] },
    ]);
  });

  it("retorna [] si la tabla está vacía", async () => {
    fakeDb.query.servicePricing.findMany.mockResolvedValue([]);
    const res = await request(makeApp()).get("/api/services");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("GET /api/services/:slug/availability", () => {
  it("retorna slots solo en horario 8-17 hs y excluye domingos", async () => {
    const res = await request(makeApp()).get(
      "/api/services/limpieza/availability"
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.slots)).toBe(true);
    expect(res.body.slots.length).toBeGreaterThan(0);
    for (const s of res.body.slots as string[]) {
      const d = new Date(s);
      expect(d.getDay()).not.toBe(0);
      expect(d.getHours()).toBeGreaterThanOrEqual(8);
      expect(d.getHours()).toBeLessThanOrEqual(17);
    }
  });
});
