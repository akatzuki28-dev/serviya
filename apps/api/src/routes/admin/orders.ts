import { Router } from "express";
import { z } from "zod";
import { getDb, schema } from "@sp/db";
import { desc, eq } from "drizzle-orm";
import { requireAdminSecret } from "../../middlewares/adminSecret";

export const adminOrdersRouter = Router();

adminOrdersRouter.use(requireAdminSecret);

const STATUS_VALUES = [
  "PENDIENTE_PAGO",
  "PAGADA",
  "CONFIRMADA",
  "EN_CAMINO",
  "EN_PROGRESO",
  "COMPLETADA",
  "CANCELADA",
  "PAGO_FALLIDO",
  "REEMBOLSADA",
] as const;

// GET /api/admin/orders — listado completo de órdenes (con proveedor)
adminOrdersRouter.get("/", async (_req, res) => {
  const db = getDb();
  const orders = await db.query.orders.findMany({
    orderBy: [desc(schema.orders.createdAt)],
    with: { provider: true },
    limit: 200,
  });
  res.json(orders);
});

const patchStatusSchema = z.object({ status: z.enum(STATUS_VALUES) });

// PATCH /api/admin/orders/:id — cambia el estado (ej: cancelar)
adminOrdersRouter.patch("/:id", async (req, res) => {
  const parsed = patchStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Estado inválido", details: parsed.error.flatten() });
    return;
  }

  const db = getDb();
  const id = req.params.id;

  const [updated] = await db
    .update(schema.orders)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(schema.orders.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Orden no encontrada" });
    return;
  }

  await db.insert(schema.orderStatusHistory).values({
    orderId: id,
    status: parsed.data.status,
    changedBy: "admin",
  });

  res.json(updated);
});

const patchProviderSchema = z.object({
  providerId: z.string().uuid().nullable(),
});

// PATCH /api/admin/orders/:id/provider — asignar/desasignar proveedor
adminOrdersRouter.patch("/:id/provider", async (req, res) => {
  const parsed = patchProviderSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Datos inválidos", details: parsed.error.flatten() });
    return;
  }

  const db = getDb();
  const id = req.params.id;

  // Si se asigna un proveedor, validar que exista.
  if (parsed.data.providerId) {
    const provider = await db.query.providers.findFirst({
      where: eq(schema.providers.id, parsed.data.providerId),
      columns: { id: true },
    });
    if (!provider) {
      res.status(404).json({ error: "Proveedor no encontrado" });
      return;
    }
  }

  const [updated] = await db
    .update(schema.orders)
    .set({ providerId: parsed.data.providerId, updatedAt: new Date() })
    .where(eq(schema.orders.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Orden no encontrada" });
    return;
  }

  res.json(updated);
});

// DELETE /api/admin/orders/:id — borra la orden y sus filas hijas (FK)
adminOrdersRouter.delete("/:id", async (req, res) => {
  const db = getDb();
  const id = req.params.id;

  const existing = await db.query.orders.findFirst({
    where: eq(schema.orders.id, id),
    columns: { id: true },
  });
  if (!existing) {
    res.status(404).json({ error: "Orden no encontrada" });
    return;
  }

  // Orden de borrado: primero los hijos que referencian la orden por FK.
  await db
    .delete(schema.orderStatusHistory)
    .where(eq(schema.orderStatusHistory.orderId, id));
  await db
    .delete(schema.providerPayouts)
    .where(eq(schema.providerPayouts.orderId, id));
  await db.delete(schema.reviews).where(eq(schema.reviews.orderId, id));
  await db.delete(schema.orders).where(eq(schema.orders.id, id));

  res.status(204).end();
});
