import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";

import { ordersRouter } from "./routes/orders";
import { providersRouter } from "./routes/providers";
import { usersRouter } from "./routes/users";
import { pricingRouter } from "./routes/pricing";
import { servicesRouter } from "./routes/services";
import { adminServicesRouter } from "./routes/admin/services";
import { adminProvidersRouter } from "./routes/admin/providers";
import { adminUsersRouter } from "./routes/admin/users";
import { mpWebhookRouter } from "./routes/webhooks/mp";
import { whatsappWebhookRouter } from "./routes/webhooks/whatsapp";
import { apiRateLimiter, webhookRateLimiter } from "./middlewares/rateLimiter";
import { seedServicesIfEmpty } from "./seed";

const app = express();
const PORT = process.env["PORT"] ?? 4000;

// Railway (y la mayoría de PaaS) pone la app detrás de un proxy que setea
// X-Forwarded-For. Sin esto, express-rate-limit no puede identificar IPs.
app.set("trust proxy", 1);

// ── Seguridad ─────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000",
    credentials: true,
  })
);

// ── Webhooks — raw body ANTES de json() para verificar firma HMAC ─────────────
app.use(
  "/api/webhooks",
  webhookRateLimiter,
  express.raw({ type: "application/json" })
);

// ── Body parsing ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(compression());

// ── Rate limiting global ───────────────────────────────────────────────────────
app.use("/api", apiRateLimiter);

// ── Rutas ──────────────────────────────────────────────────────────────────────
app.use("/api/orders", ordersRouter);
app.use("/api/providers", providersRouter);
app.use("/api/users", usersRouter);
app.use("/api/pricing", pricingRouter);
app.use("/api/services", servicesRouter);
app.use("/api/admin/services", adminServicesRouter);
app.use("/api/admin/providers", adminProvidersRouter);
app.use("/api/admin/users", adminUsersRouter);
app.use("/api/webhooks/mp", mpWebhookRouter);
app.use("/api/webhooks/whatsapp", whatsappWebhookRouter);

// ── Health check ───────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Error handler ──────────────────────────────────────────────────────────────
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(err.stack);
    res.status(500).json({ error: "Internal Server Error" });
  }
);

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
  // Seed inicial idempotente — solo inserta si la tabla está vacía.
  seedServicesIfEmpty().catch((err) => {
    console.error("[seed] failed:", err);
  });
});

export default app;
