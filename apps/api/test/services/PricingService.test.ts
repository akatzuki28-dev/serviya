import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeFakeDb, type FakeDb } from "../helpers/db";

const fakeDb: FakeDb = makeFakeDb();

vi.mock("@sp/db", () => ({
  getDb: () => fakeDb,
  schema: {
    servicePricing: { serviceType: "serviceType", zone: "zone" },
  },
}));

import { PricingService } from "../../src/services/PricingService";

// Instancia compartida de Redis falso, definida en test/setup.ts. Existe desde
// que se importa PricingService (que crea su cliente con `new Redis()`), así que
// está disponible en el beforeEach aunque el servicio la cree de forma lazy.
const redis = () =>
  (globalThis as Record<string, unknown>)["__fakeRedis"] as {
    store: Map<string, string>;
    setex: ReturnType<typeof vi.fn>;
  };

describe("PricingService.quote", () => {
  beforeEach(() => {
    redis().store.clear();
    fakeDb.query.servicePricing.findFirst.mockReset();
  });

  // ── HAPPY PATHS ──────────────────────────────────────────────────────────
  it("calcula total = base + extras y aplica fee 15% por defecto", async () => {
    // Sin zone: el servicio hace UNA sola consulta (baseRow), no dos.
    fakeDb.query.servicePricing.findFirst.mockResolvedValue({
      basePrice: "10000",
      extras: [
        { id: "windows", label: "Ventanas", price: 2000 },
        { id: "fridge", label: "Heladera", price: 3000 },
      ],
    });

    const q = await PricingService.quote({
      serviceType: "limpieza-profunda",
      extras: ["windows", "fridge"],
    });

    expect(q.basePrice).toBe(10000);
    expect(q.extrasTotal).toBe(5000);
    expect(q.total).toBe(15000);
    expect(q.platformFee).toBe(2250); // 15%
    expect(q.netToProvider).toBe(12750);
    expect(q.breakdown).toEqual([
      { label: "Precio base", amount: 10000 },
      { label: "Ventanas", amount: 2000 },
      { label: "Heladera", amount: 3000 },
    ]);
  });

  it("usa precio específico de zona si existe", async () => {
    fakeDb.query.servicePricing.findFirst.mockResolvedValueOnce({
      basePrice: "12000",
      extras: [],
    });
    fakeDb.query.servicePricing.findFirst.mockResolvedValueOnce({
      basePrice: "10000",
      extras: [],
    });

    const q = await PricingService.quote({
      serviceType: "limpieza",
      zone: "palermo",
    });
    expect(q.basePrice).toBe(12000);
  });

  it("fallback al precio base si la zona no tiene tarifa propia", async () => {
    fakeDb.query.servicePricing.findFirst.mockResolvedValueOnce(null);
    fakeDb.query.servicePricing.findFirst.mockResolvedValueOnce({
      basePrice: "8000",
      extras: [],
    });

    const q = await PricingService.quote({
      serviceType: "limpieza",
      zone: "zona-inexistente",
    });
    expect(q.basePrice).toBe(8000);
  });

  // ── CACHE ────────────────────────────────────────────────────────────────
  it("escribe en caché con TTL 300s la primera vez", async () => {
    fakeDb.query.servicePricing.findFirst.mockResolvedValue({
      basePrice: "5000",
      extras: [],
    });

    await PricingService.quote({ serviceType: "x" });
    expect(redis().setex).toHaveBeenCalledWith(
      "pricing:x:base",
      300,
      expect.any(String)
    );
  });

  it("hit de caché: no consulta DB", async () => {
    redis().store.set(
      "pricing:x:base",
      JSON.stringify({ basePrice: 7000, extras: [] })
    );
    const q = await PricingService.quote({ serviceType: "x" });
    expect(q.total).toBe(7000);
    expect(fakeDb.query.servicePricing.findFirst).not.toHaveBeenCalled();
  });

  // ── EDGE CASES ───────────────────────────────────────────────────────────
  it("ignora extras desconocidos sin lanzar", async () => {
    fakeDb.query.servicePricing.findFirst.mockResolvedValue({
      basePrice: "1000",
      extras: [{ id: "a", label: "A", price: 100 }],
    });
    const q = await PricingService.quote({
      serviceType: "x",
      extras: ["a", "ghost"],
    });
    expect(q.total).toBe(1100);
  });

  it("acepta lista de extras vacía", async () => {
    fakeDb.query.servicePricing.findFirst.mockResolvedValue({
      basePrice: "1000",
      extras: [],
    });
    const q = await PricingService.quote({ serviceType: "x", extras: [] });
    expect(q.extrasTotal).toBe(0);
  });

  it("respeta override de fee por env (10%)", async () => {
    const prev = process.env.PLATFORM_FEE_PERCENT;
    process.env.PLATFORM_FEE_PERCENT = "10";
    try {
      fakeDb.query.servicePricing.findFirst.mockResolvedValue({
        basePrice: "1000",
        extras: [],
      });
      const q = await PricingService.quote({ serviceType: "x" });
      expect(q.platformFee).toBe(100);
      expect(q.netToProvider).toBe(900);
    } finally {
      process.env.PLATFORM_FEE_PERCENT = prev;
    }
  });

  it("redondea fee a 2 decimales (precio impar)", async () => {
    fakeDb.query.servicePricing.findFirst.mockResolvedValue({
      basePrice: "1234.55",
      extras: [],
    });
    const q = await PricingService.quote({ serviceType: "x" });
    // 1234.55 * 0.15 = 185.1825 → 185.18
    expect(q.platformFee).toBe(185.18);
  });

  // ── FAILURE SCENARIOS ────────────────────────────────────────────────────
  it("lanza 'No pricing found' si no hay registros", async () => {
    fakeDb.query.servicePricing.findFirst.mockResolvedValue(null);
    await expect(
      PricingService.quote({ serviceType: "fantasma" })
    ).rejects.toThrow(/No pricing found/);
  });
});
