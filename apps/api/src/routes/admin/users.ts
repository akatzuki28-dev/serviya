import { Router } from "express";
import { z } from "zod";
import { getDb, schema } from "@sp/db";
import { desc, ilike, or, sql, eq, inArray } from "drizzle-orm";
import { requireAdminSecret } from "../../middlewares/adminSecret";

export const adminUsersRouter = Router();

adminUsersRouter.use(requireAdminSecret);

const ROLE_VALUES = ["CLIENT", "PROVIDER", "ADMIN"] as const;

// GET /api/admin/users?q=foo&role=CLIENT&limit=50&withCounts=1
adminUsersRouter.get("/", async (req, res) => {
  const db = getDb();
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const role =
    typeof req.query.role === "string" &&
    (ROLE_VALUES as readonly string[]).includes(req.query.role)
      ? (req.query.role as (typeof ROLE_VALUES)[number])
      : null;
  const withCounts = req.query.withCounts === "1" || req.query.withCounts === "true";

  const limitRaw = Number(req.query.limit ?? 50);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(limitRaw, 1), 500)
    : 50;

  const conditions = [] as ReturnType<typeof ilike>[];
  if (q) {
    const like = `%${q}%`;
    conditions.push(ilike(schema.users.email, like));
    conditions.push(ilike(schema.users.phone, like));
    conditions.push(ilike(schema.users.name, like));
  }

  const whereClause = q
    ? role
      ? sql`(${or(...conditions)}) AND ${eq(schema.users.role, role)}`
      : or(...conditions)
    : role
      ? eq(schema.users.role, role)
      : undefined;

  const rows = await db.query.users.findMany({
    where: whereClause,
    orderBy: [desc(schema.users.createdAt)],
    limit,
    columns: {
      id: true,
      email: true,
      phone: true,
      name: true,
      image: true,
      role: true,
      authProvider: true,
      createdAt: true,
    },
  });

  if (!withCounts || rows.length === 0) {
    res.json(rows.map((r) => ({ ...r, ordersCount: undefined })));
    return;
  }

  const ids = rows.map((r) => r.id);
  const counts = await db
    .select({
      userId: schema.orders.userId,
      n: sql<number>`count(*)::int`,
    })
    .from(schema.orders)
    .where(inArray(schema.orders.userId, ids))
    .groupBy(schema.orders.userId);

  const countMap = new Map<string, number>();
  for (const c of counts) {
    if (c.userId) countMap.set(c.userId, c.n);
  }

  res.json(rows.map((r) => ({ ...r, ordersCount: countMap.get(r.id) ?? 0 })));
});

// GET /api/admin/users/count — total + breakdown por rol
adminUsersRouter.get("/count", async (_req, res) => {
  const db = getDb();
  const rows = await db
    .select({
      role: schema.users.role,
      n: sql<number>`count(*)::int`,
    })
    .from(schema.users)
    .groupBy(schema.users.role);

  const byRole = Object.fromEntries(rows.map((r) => [r.role, r.n]));
  const total = rows.reduce((acc, r) => acc + r.n, 0);
  res.json({ total, byRole });
});

// GET /api/admin/users/:id — detalle con conteo de órdenes
adminUsersRouter.get("/:id", async (req, res) => {
  const db = getDb();
  const id = req.params.id;

  const row = await db.query.users.findFirst({
    where: eq(schema.users.id, id),
    columns: {
      id: true,
      email: true,
      phone: true,
      name: true,
      image: true,
      role: true,
      authProvider: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!row) {
    res.status(404).json({ error: "Usuario no encontrado" });
    return;
  }

  const [count] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.orders)
    .where(eq(schema.orders.userId, id));

  res.json({ ...row, ordersCount: count?.n ?? 0 });
});

// GET /api/admin/users/:id/orders — órdenes del usuario
adminUsersRouter.get("/:id/orders", async (req, res) => {
  const db = getDb();
  const id = req.params.id;
  const orders = await db.query.orders.findMany({
    where: eq(schema.orders.userId, id),
    orderBy: [desc(schema.orders.createdAt)],
    with: { provider: true },
    limit: 100,
  });
  res.json(orders);
});

// ── Direcciones del usuario ─────────────────────────────────────────────────
// Espejo admin-secret de /api/users/:id/addresses (que usa Bearer y no sirve
// desde server components). El web scopea estas llamadas al userId de la sesión.

const addressSchema = z.object({
  label: z.string().max(50).nullable().optional(),
  street: z.string().min(1).max(200),
  city: z.string().min(1).max(100),
  isDefault: z.boolean().optional(),
});

// GET /api/admin/users/:id/addresses
adminUsersRouter.get("/:id/addresses", async (req, res) => {
  const db = getDb();
  const addresses = await db.query.userAddresses.findMany({
    where: eq(schema.userAddresses.userId, req.params.id),
    orderBy: [desc(schema.userAddresses.isDefault), desc(schema.userAddresses.createdAt)],
  });
  res.json(addresses);
});

// POST /api/admin/users/:id/addresses
adminUsersRouter.post("/:id/addresses", async (req, res) => {
  const parsed = addressSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Datos inválidos", details: parsed.error.flatten() });
    return;
  }

  const db = getDb();

  if (parsed.data.isDefault) {
    await db
      .update(schema.userAddresses)
      .set({ isDefault: false })
      .where(eq(schema.userAddresses.userId, req.params.id));
  }

  const [address] = await db
    .insert(schema.userAddresses)
    .values({
      userId: req.params.id,
      label: parsed.data.label ?? null,
      street: parsed.data.street,
      city: parsed.data.city,
      isDefault: parsed.data.isDefault ?? false,
    })
    .returning();

  res.status(201).json(address);
});

// PUT /api/admin/users/:id/addresses/:addressId
adminUsersRouter.put("/:id/addresses/:addressId", async (req, res) => {
  const parsed = addressSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Datos inválidos", details: parsed.error.flatten() });
    return;
  }

  const db = getDb();

  if (parsed.data.isDefault) {
    await db
      .update(schema.userAddresses)
      .set({ isDefault: false })
      .where(eq(schema.userAddresses.userId, req.params.id));
  }

  const [updated] = await db
    .update(schema.userAddresses)
    .set({
      label: parsed.data.label ?? null,
      street: parsed.data.street,
      city: parsed.data.city,
      isDefault: parsed.data.isDefault ?? false,
    })
    .where(eq(schema.userAddresses.id, req.params.addressId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Dirección no encontrada" });
    return;
  }
  res.json(updated);
});

// PATCH /api/admin/users/:id/addresses/:addressId/default — marcar como default
adminUsersRouter.patch("/:id/addresses/:addressId/default", async (req, res) => {
  const db = getDb();
  await db
    .update(schema.userAddresses)
    .set({ isDefault: false })
    .where(eq(schema.userAddresses.userId, req.params.id));

  const [updated] = await db
    .update(schema.userAddresses)
    .set({ isDefault: true })
    .where(eq(schema.userAddresses.id, req.params.addressId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Dirección no encontrada" });
    return;
  }
  res.json(updated);
});

// DELETE /api/admin/users/:id/addresses/:addressId
adminUsersRouter.delete("/:id/addresses/:addressId", async (req, res) => {
  const db = getDb();
  await db
    .delete(schema.userAddresses)
    .where(eq(schema.userAddresses.id, req.params.addressId));
  res.status(204).end();
});

const patchSchema = z.object({
  role: z.enum(ROLE_VALUES).optional(),
  phone: z.string().max(50).nullable().optional(),
  name: z.string().max(255).nullable().optional(),
});

// PATCH /api/admin/users/:id — editar rol / datos básicos
adminUsersRouter.patch("/:id", async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
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
  patch["updatedAt"] = new Date();

  const db = getDb();
  const [updated] = await db
    .update(schema.users)
    .set(patch)
    .where(eq(schema.users.id, req.params.id))
    .returning({
      id: schema.users.id,
      email: schema.users.email,
      phone: schema.users.phone,
      name: schema.users.name,
      role: schema.users.role,
    });

  if (!updated) {
    res.status(404).json({ error: "Usuario no encontrado" });
    return;
  }
  res.json(updated);
});
