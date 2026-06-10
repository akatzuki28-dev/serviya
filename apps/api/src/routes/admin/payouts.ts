import { Router } from "express";
import { z } from "zod";
import { getDb, schema } from "@sp/db";
import { desc, eq, and, isNotNull, notInArray } from "drizzle-orm";
import { requireAdminSecret } from "../../middlewares/adminSecret";

export const adminPayoutsRouter = Router();

adminPayoutsRouter.use(requireAdminSecret);

const PAYOUT_STATUSES = ["PENDIENTE", "PAGADO"] as const;

// GET /api/admin/payouts?status=PENDIENTE — liquidaciones con proveedor y orden
adminPayoutsRouter.get("/", async (req, res) => {
  const db = getDb();
  const status =
    typeof req.query.status === "string" &&
    (PAYOUT_STATUSES as readonly string[]).includes(req.query.status)
      ? (req.query.status as (typeof PAYOUT_STATUSES)[number])
      : null;

  const rows = await db.query.providerPayouts.findMany({
    where: status ? eq(schema.providerPayouts.status, status) : undefined,
    orderBy: [desc(schema.providerPayouts.createdAt)],
    with: {
      provider: { columns: { id: true, name: true, phone: true } },
      order: { columns: { id: true, serviceType: true, scheduledAt: true, status: true } },
    },
    limit: 500,
  });

  res.json(rows);
});

// PATCH /api/admin/payouts/:id — cambiar estado (marcar PAGADO)
const patchSchema = z.object({ status: z.enum(PAYOUT_STATUSES) });

adminPayoutsRouter.patch("/:id", async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Estado inválido", details: parsed.error.flatten() });
    return;
  }

  const db = getDb();
  const [updated] = await db
    .update(schema.providerPayouts)
    .set({ status: parsed.data.status })
    .where(eq(schema.providerPayouts.id, req.params.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Liquidación no encontrada" });
    return;
  }
  res.json(updated);
});

// POST /api/admin/payouts/generate — generar liquidaciones de órdenes COMPLETADA
// con proveedor asignado que todavía no tengan una. gross/fee/net salen de la orden.
adminPayoutsRouter.post("/generate", async (_req, res) => {
  const db = getDb();

  const existing = await db
    .select({ orderId: schema.providerPayouts.orderId })
    .from(schema.providerPayouts);
  const usedOrderIds = existing.map((e) => e.orderId);

  const completed = await db.query.orders.findMany({
    where: and(
      eq(schema.orders.status, "COMPLETADA"),
      isNotNull(schema.orders.providerId),
      usedOrderIds.length > 0
        ? notInArray(schema.orders.id, usedOrderIds)
        : undefined
    ),
    columns: {
      id: true,
      providerId: true,
      grossAmount: true,
      platformFee: true,
      netAmount: true,
    },
  });

  if (completed.length === 0) {
    res.json({ generated: 0 });
    return;
  }

  const values = completed
    .filter((o) => o.providerId)
    .map((o) => ({
      providerId: o.providerId as string,
      orderId: o.id,
      grossAmount: o.grossAmount,
      platformFee: o.platformFee,
      netAmount: o.netAmount,
      status: "PENDIENTE",
    }));

  if (values.length === 0) {
    res.json({ generated: 0 });
    return;
  }

  const inserted = await db.insert(schema.providerPayouts).values(values).returning({
    id: schema.providerPayouts.id,
  });

  res.json({ generated: inserted.length });
});
