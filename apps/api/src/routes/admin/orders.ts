import { Router } from "express";
import { getDb, schema } from "@sp/db";
import { desc, eq } from "drizzle-orm";
import { requireAdminSecret } from "../../middlewares/adminSecret";

export const adminOrdersRouter = Router();

adminOrdersRouter.use(requireAdminSecret);

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
  await db.delete(schema.orders).where(eq(schema.orders.id, id));

  res.status(204).end();
});
