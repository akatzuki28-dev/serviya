import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";

// vi.hoisted: la factory de vi.mock se hoistea arriba de todo, así que la
// referencia a quoteMock debe estar inicializada antes (si no, TDZ error).
const { quoteMock } = vi.hoisted(() => ({ quoteMock: vi.fn() }));
vi.mock("../../src/services/PricingService", () => ({
  PricingService: { quote: quoteMock },
}));

import { PricingService } from "../../src/services/PricingService";
import { pricingRouter } from "../../src/routes/pricing";

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/pricing", pricingRouter);
  return app;
}

describe("POST /api/pricing/quote", () => {
  beforeEach(() => {
    quoteMock.mockReset();
    (PricingService as { quote: unknown }).quote = quoteMock;
  });
  // Restaurar el spy por si algún test lo reemplazó por una función plana.
  afterEach(() => {
    (PricingService as { quote: unknown }).quote = quoteMock;
  });

  it("200 retorna la cotización del service", async () => {
    quoteMock.mockResolvedValue({
      basePrice: 1000,
      extrasTotal: 0,
      total: 1000,
      platformFee: 150,
      netToProvider: 850,
      breakdown: [],
    });
    const res = await request(makeApp())
      .post("/api/pricing/quote")
      .send({ serviceType: "limpieza" });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1000);
  });

  it("400 si serviceType vacío", async () => {
    const res = await request(makeApp())
      .post("/api/pricing/quote")
      .send({ serviceType: "" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it("400 si body no es JSON parseable como esperado (extras debe ser array)", async () => {
    const res = await request(makeApp())
      .post("/api/pricing/quote")
      .send({ serviceType: "x", extras: "not-array" });
    expect(res.status).toBe(400);
  });

  // Para el mapeo de errores, PricingService.quote se reemplaza por una función
  // PLANA (no vi.fn) que rechaza. El route maneja el rechazo (await en try/catch)
  // y responde 404/500. Usar una función plana evita el tracking de resultados de
  // vi.fn, que en este route dispara un falso positivo de Vitest 2.x (marca como
  // error del test una promesa rechazada que el route ya manejó). El beforeEach/
  // afterEach restauran el spy para no afectar a otros tests.
  it("404 si el servicio no existe", async () => {
    (PricingService as { quote: unknown }).quote = () =>
      Promise.reject(new Error("No pricing found for x"));
    const res = await request(makeApp())
      .post("/api/pricing/quote")
      .send({ serviceType: "x" });
    expect(res.status).toBe(404);
  });

  it("500 ante error inesperado", async () => {
    (PricingService as { quote: unknown }).quote = () =>
      Promise.reject(new Error("boom"));
    const res = await request(makeApp())
      .post("/api/pricing/quote")
      .send({ serviceType: "x" });
    expect(res.status).toBe(500);
  });
});
