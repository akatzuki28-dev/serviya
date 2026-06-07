import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { Redis } from "ioredis";

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(process.env["REDIS_URL"] ?? "redis://localhost:6379");
  }
  return redis;
}

export const apiRateLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args: string[]) => getRedis().call(...args) as any,
    prefix: "rl:api:",
  }),
});

export const bookingRateLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  message: { error: "Demasiados intentos. Intenta en 1 minuto." },
  store: new RedisStore({
    sendCommand: (...args: string[]) => getRedis().call(...args) as any,
    prefix: "rl:booking:",
  }),
});

export const webhookRateLimiter = rateLimit({
  windowMs: 60_000,
  max: 100,
  store: new RedisStore({
    sendCommand: (...args: string[]) => getRedis().call(...args) as any,
    prefix: "rl:webhook:",
  }),
});
