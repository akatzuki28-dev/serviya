import { Router } from "express";
import { z } from "zod";
import { getDb, schema } from "@sp/db";
import { eq, desc } from "drizzle-orm";
import { requireAdminSecret } from "../../middlewares/adminSecret";

export const adminProvidersRouter = Router();

adminProvidersRouter.use(requireAdminSecret);

// GET /api/admin/providers — todos (activos e inactivos)
adminProvidersRouter.get("/", async (_req, res) => {
  const db = getDb();
  const rows = await db.query.providers.findMany({
    orderBy: [desc(schema.providers.createdAt)],
  });
  res.json(rows);
});

// GET /api/admin/providers/:id
adminProvidersRouter.get("/:id", async (req, res) => {
  const db = getDb();
  const row = await db.query.providers.findFirst({
    where: eq(schema.providers.id, req.params.id),
  });
  if (!row) {
    res.status(404).json({ error: "Proveedor no encontrado" });
    return;
  }
  res.json(row);
});

const createSchema = z.object({
  name: z.string().min(1).max(255),
  phone: z.string().max(50).nullable().optional(),
  serviceCategories: z.array(z.string()).default([]),
  coverageZones: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

const updateSchema = createSchema.partial();

// POST /api/admin/providers — crear
adminProvidersRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Datos inválidos", details: parsed.error.flatten() });
    return;
  }

  const db = getDb();
  const [created] = await db
    .insert(schema.providers)
    .values({
      name: parsed.data.name,
      phone: parsed.data.phone ?? null,
      serviceCategories: parsed.data.serviceCategories,
      coverageZones: parsed.data.coverageZones,
      isActive: parsed.data.isActive,
    })
    .returning();

  res.status(201).json(created);
});

// PATCH /api/admin/providers/:id — editar (incluye toggle isActive)
adminProvidersRouter.patch("/:id", async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Datos inválidos", details: parsed.error.flatten() });
    return;
  }

  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) patch[k] = v;
  }
  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: "Nada para actualizar" });
    return;
  }

  const db = getDb();
  const [updated] = await db
    .update(schema.providers)
    .set(patch)
    .where(eq(schema.providers.id, req.params.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Proveedor no encontrado" });
    return;
  }

  res.json(updated);
});
