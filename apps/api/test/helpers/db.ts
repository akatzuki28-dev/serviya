import { vi } from "vitest";

/**
 * Crea un objeto "chainable + thenable" que devuelve `result` cuando se hace
 * `await` y se autoreferencia para cualquier método encadenado (values, where,
 * set, onConflictDoUpdate, returning, etc.). Sirve para mockear Drizzle sin
 * tener que stubear cada paso individualmente.
 */
export function chain<T>(result: T): any {
  const target: any = {
    then: (onF: any, onR: any) => Promise.resolve(result).then(onF, onR),
    catch: (onR: any) => Promise.resolve(result).catch(onR),
    finally: (onF: any) => Promise.resolve(result).finally(onF),
  };
  const proxy: any = new Proxy(target, {
    get(t, prop) {
      if (prop in t) return (t as any)[prop];
      // Cualquier otro método del chain devuelve el mismo proxy
      return () => proxy;
    },
  });
  return proxy;
}

export interface FakeDb {
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  query: {
    orders: {
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
    users: {
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
    providers: {
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
    servicePricing: {
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
    userAddresses: {
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
  };
}

export function makeFakeDb(): FakeDb {
  return {
    insert: vi.fn(() => chain([])),
    update: vi.fn(() => chain([])),
    delete: vi.fn(() => chain(undefined)),
    select: vi.fn(() => chain([])),
    query: {
      orders: { findFirst: vi.fn(), findMany: vi.fn() },
      users: { findFirst: vi.fn(), findMany: vi.fn() },
      providers: { findFirst: vi.fn(), findMany: vi.fn() },
      servicePricing: { findFirst: vi.fn(), findMany: vi.fn() },
      userAddresses: { findFirst: vi.fn(), findMany: vi.fn() },
    },
  };
}
