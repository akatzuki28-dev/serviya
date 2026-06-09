import { Router } from "express";
import { getDb, schema } from "@sp/db";
import { desc } from "drizzle-orm";
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
