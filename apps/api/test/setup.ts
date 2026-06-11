import { vi, beforeEach } from "vitest";

// ── Env determinístico para todos los tests ──────────────────────────────────
process.env.NODE_ENV = "test";
process.env.NEXTAUTH_SECRET = "test-secret-please-do-not-use-in-prod";
process.env.MP_ACCESS_TOKEN = "TEST-mp-token";
process.env.MP_WEBHOOK_SECRET = "test-mp-webhook-secret";
process.env.WA_ACCESS_TOKEN = "test-wa-token";
process.env.WA_PHONE_NUMBER_ID = "1234567890";
process.env.WA_VERIFY_TOKEN = "test-verify-token";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
process.env.NEXT_PUBLIC_API_URL = "http://localhost:4000";
process.env.REDIS_URL = "redis://localhost:6379";
process.env.PLATFORM_FEE_PERCENT = "15";

// ── Mock global de bull (NotificationService lo carga en import) ─────────────
vi.mock("bull", () => {
  class FakeQueue {
    constructor(_name: string, _opts?: unknown) {}
    add = vi.fn().mockResolvedValue({ id: "job-1" });
    process = vi.fn();
    on = vi.fn();
    close = vi.fn().mockResolvedValue(undefined);
  }
  return { default: FakeQueue };
});

// ── Mock global de ioredis ───────────────────────────────────────────────────
// `new Redis(url)` devuelve SIEMPRE la misma instancia compartida. Así los tests
// pueden inspeccionar/poblar el store aunque el servicio cree el cliente de forma
// lazy (PricingService crea el suyo recién en la primera quote()). La instancia se
// expone en globalThis.__fakeRedis para que los tests la lean. `store` es público.
vi.mock("ioredis", () => {
  class FakeRedis {
    store = new Map<string, string>();
    get = vi.fn(async (k: string) => this.store.get(k) ?? null);
    set = vi.fn(async (k: string, v: string) => {
      this.store.set(k, v);
      return "OK";
    });
    setex = vi.fn(async (k: string, _ttl: number, v: string) => {
      this.store.set(k, v);
      return "OK";
    });
    del = vi.fn(async (k: string) => (this.store.delete(k) ? 1 : 0));
    call = vi.fn(async () => null);
    on = vi.fn();
    quit = vi.fn().mockResolvedValue("OK");
    disconnect = vi.fn();
  }
  const shared = new FakeRedis();
  (globalThis as Record<string, unknown>)["__fakeRedis"] = shared;
  function Redis() {
    return shared;
  }
  return { Redis, default: Redis };
});

// ── Mock global de rate limiters (no-op en tests) ────────────────────────────
vi.mock("../src/middlewares/rateLimiter", () => {
  const noop = (_req: unknown, _res: unknown, next: () => void) => next();
  return {
    apiRateLimiter: noop,
    bookingRateLimiter: noop,
    webhookRateLimiter: noop,
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});
