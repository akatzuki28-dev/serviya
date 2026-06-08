import { Router } from "express";
import { z } from "zod";
import { getDb, schema } from "@sp/db";
import { eq, isNull, and } from "drizzle-orm";
import { requireAdminSecret } from "../../middlewares/adminSecret";

export const adminServicesRouter = Router();

adminServicesRouter.use(requireAdminSecret);

// GET /api/admin/services — listado completo (incluye comingSoon + description)
adminServicesRouter.get("/", async (_req, res) => {
  const db = getDb();
  const rows = await db.query.servicePricing.findMany({
    where: isNull(schema.servicePricing.zone),
  });

  const services = rows.map((r) => ({
    id: r.id,
    slug: r.serviceType,
    basePrice: Number(r.basePrice),
    description: r.description ?? "",
    comingSoon: r.comingSoon,
  }));

  res.json(services);
});

const updateSchema = z.object({
  basePrice: z.number().nonnegative().optional(),
  description: z.string().max(500).nullable().optional(),
  comingSoon: z.boolean().optional(),
});

// PUT /api/admin/services/:slug — actualiza un servicio por slug
adminServicesRouter.put("/:slug", async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Datos inválidos", details: parsed.error.flatten() });
    return;
  }

  const db = getDb();
  const slug = req.params.slug;

  const patch: Record<string, unknown> = {};
  if (parsed.data.basePrice !== undefined) {
    patch["basePrice"] = parsed.data.basePrice.toFixed(2);
  }
  if (parsed.data.description !== undefined) {
    patch["description"] = parsed.data.description;
  }
  if (parsed.data.comingSoon !== undefined) {
    patch["comingSoon"] = parsed.data.comingSoon;
  }

  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: "Nada para actualizar" });
    return;
  }

  const updated = await db
    .update(schema.servicePricing)
    .set(patch)
    .where(
      and(
        eq(schema.servicePricing.serviceType, slug),
        isNull(schema.servicePricing.zone)
      )
    )
    .returning();

  if (updated.length === 0) {
    res.status(404).json({ error: "Servicio no encontrado" });
    return;
  }

  const r = updated[0]!;
  res.json({
    id: r.id,
    slug: r.serviceType,
    basePrice: Number(r.basePrice),
    description: r.description ?? "",
    comingSoon: r.comingSoon,
  });
});
