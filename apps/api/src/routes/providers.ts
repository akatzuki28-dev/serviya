import { Router } from "express";
import { z } from "zod";
import { getDb, schema } from "@sp/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

export const providersRouter = Router();

// GET /api/providers — listar (admin o público para selección)
providersRouter.get("/", async (_req, res) => {
  const db = getDb();
  const providers = await db.query.providers.findMany({
    where: eq(schema.providers.isActive, true),
  });
  res.json(providers);
});

const providerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  serviceCategories: z.array(z.string()).optional(),
  coverageZones: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  userId: z.string().uuid().optional(),
});

// POST /api/providers — crear (admin)
providersRouter.post(
  "/",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res) => {
    const parsed = providerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const db = getDb();
    const [provider] = await db
      .insert(schema.providers)
      .values(parsed.data)
      .returning();

    res.status(201).json(provider);
  }
);

// PATCH /api/providers/:id — editar (admin)
providersRouter.patch(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res) => {
    const parsed = providerSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const db = getDb();
    const [updated] = await db
      .update(schema.providers)
      .set(parsed.data)
      .where(eq(schema.providers.id, req.params["id"]!))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Proveedor no encontrado" });
      return;
    }

    res.json(updated);
  }
);

// GET /api/providers/:id/orders — órdenes de un proveedor
providersRouter.get("/:id/orders", requireAuth, requireRole("ADMIN", "PROVIDER"), async (req, res) => {
  const db = getDb();
  const orders = await db.query.orders.findMany({
    where: eq(schema.orders.providerId, req.params["id"]!),
    with: { provider: true },
  });
  res.json(orders);
});
