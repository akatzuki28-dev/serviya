import { Redis } from "ioredis";
import { getDb, schema } from "@sp/db";
import { and, eq, isNull } from "drizzle-orm";

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(process.env["REDIS_URL"] ?? "redis://localhost:6379");
  }
  return redis;
}

export interface QuoteInput {
  serviceType: string;
  zone?: string;
  extras?: string[];
}

export interface QuoteResult {
  basePrice: number;
  extrasTotal: number;
  total: number;
  platformFee: number;
  netToProvider: number;
  breakdown: { label: string; amount: number }[];
}

export class PricingService {
  static async quote(input: QuoteInput): Promise<QuoteResult> {
    const cacheKey = `pricing:${input.serviceType}:${input.zone ?? "base"}`;
    const cached = await getRedis().get(cacheKey);

    let basePrice: number;
    let extrasConfig: { id: string; label: string; price: number }[] = [];

    if (cached) {
      const parsed = JSON.parse(cached);
      basePrice = parsed.basePrice;
      extrasConfig = parsed.extras;
    } else {
      const db = getDb();

      // Buscar precio específico por zona, o fallback a precio base
      const zoneRow = input.zone
        ? await db.query.servicePricing.findFirst({
            where: and(
              eq(schema.servicePricing.serviceType, input.serviceType),
              eq(schema.servicePricing.zone, input.zone)
            ),
          })
        : null;

      const baseRow = await db.query.servicePricing.findFirst({
        where: and(
          eq(schema.servicePricing.serviceType, input.serviceType),
          isNull(schema.servicePricing.zone)
        ),
      });

      const row = zoneRow ?? baseRow;
      if (!row) throw new Error(`No pricing found for ${input.serviceType}`);

      basePrice = Number(row.basePrice);
      extrasConfig = (row.extras as typeof extrasConfig) ?? [];

      await getRedis().setex(
        cacheKey,
        300,
        JSON.stringify({ basePrice, extras: extrasConfig })
      );
    }

    const selectedExtras = extrasConfig.filter((e) =>
      input.extras?.includes(e.id)
    );
    const extrasTotal = selectedExtras.reduce((sum, e) => sum + e.price, 0);
    const total = basePrice + extrasTotal;

    const feePercent =
      Number(process.env["PLATFORM_FEE_PERCENT"] ?? "15") / 100;
    const platformFee = Math.round(total * feePercent * 100) / 100;
    const netToProvider = total - platformFee;

    const breakdown: { label: string; amount: number }[] = [
      { label: "Precio base", amount: basePrice },
      ...selectedExtras.map((e) => ({ label: e.label, amount: e.price })),
    ];

    return { basePrice, extrasTotal, total, platformFee, netToProvider, breakdown };
  }
}
