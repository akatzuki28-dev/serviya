import { Router } from "express";
import { z } from "zod";
import { getDb, schema } from "@sp/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

export const usersRouter = Router();

// GET /api/users/:id/orders — historial del cliente (solo el propio usuario o ADMIN)
usersRouter.get("/:id/orders", requireAuth, async (req: AuthRequest, res) => {
  if (req.user?.role !== "ADMIN" && req.user?.id !== req.params["id"]) {
    res.status(403).json({ error: "Acceso denegado" });
    return;
  }

  const db = getDb();
  const orders = await db.query.orders.findMany({
    where: eq(schema.orders.userId, req.params["id"]!),
    orderBy: [desc(schema.orders.createdAt)],
    with: { provider: true },
  });

  res.json(orders);
});

// GET /api/users/:id/addresses
usersRouter.get("/:id/addresses", requireAuth, async (req: AuthRequest, res) => {
  if (req.user?.role !== "ADMIN" && req.user?.id !== req.params["id"]) {
    res.status(403).json({ error: "Acceso denegado" });
    return;
  }

  const db = getDb();
  const addresses = await db.query.userAddresses.findMany({
    where: eq(schema.userAddresses.userId, req.params["id"]!),
  });

  res.json(addresses);
});

const addressSchema = z.object({
  label: z.string().max(50).optional(),
  street: z.string().min(1).max(200),
  city: z.string().min(1).max(100),
  isDefault: z.boolean().optional(),
});

// POST /api/users/:id/addresses
usersRouter.post("/:id/addresses", requireAuth, async (req: AuthRequest, res) => {
  if (req.user?.id !== req.params["id"]) {
    res.status(403).json({ error: "Acceso denegado" });
    return;
  }

  const parsed = addressSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const db = getDb();

  if (parsed.data.isDefault) {
    await db
      .update(schema.userAddresses)
      .set({ isDefault: false })
      .where(eq(schema.userAddresses.userId, req.params["id"]!));
  }

  const [address] = await db
    .insert(schema.userAddresses)
    .values({ ...parsed.data, userId: req.params["id"] })
    .returning();

  res.status(201).json(address);
});

// PUT /api/users/:id/addresses/:addressId
usersRouter.put("/:id/addresses/:addressId", requireAuth, async (req: AuthRequest, res) => {
  if (req.user?.id !== req.params["id"]) {
    res.status(403).json({ error: "Acceso denegado" });
    return;
  }

  const parsed = addressSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const db = getDb();
  const [updated] = await db
    .update(schema.userAddresses)
    .set(parsed.data)
    .where(eq(schema.userAddresses.id, req.params["addressId"]!))
    .returning();

  res.json(updated);
});

// DELETE /api/users/:id/addresses/:addressId
usersRouter.delete("/:id/addresses/:addressId", requireAuth, async (req: AuthRequest, res) => {
  if (req.user?.id !== req.params["id"]) {
    res.status(403).json({ error: "Acceso denegado" });
    return;
  }

  const db = getDb();
  await db
    .delete(schema.userAddresses)
    .where(eq(schema.userAddresses.id, req.params["addressId"]!));

  res.status(204).send();
});
