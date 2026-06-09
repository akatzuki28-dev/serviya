import { Router } from "express";
import { getDb, schema } from "@sp/db";
import { desc, ilike, or, sql } from "drizzle-orm";
import { requireAdminSecret } from "../../middlewares/adminSecret";

export const adminUsersRouter = Router();

adminUsersRouter.use(requireAdminSecret);

// GET /api/admin/users?q=foo&limit=50 — listado liviano para selects/búsquedas
adminUsersRouter.get("/", async (req, res) => {
  const db = getDb();
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const limitRaw = Number(req.query.limit ?? 50);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(limitRaw, 1), 200)
    : 50;

  const whereClause = q
    ? or(
        ilike(schema.users.email, `%${q}%`),
        ilike(schema.users.phone, `%${q}%`)
      )
    : undefined;

  const rows = await db.query.users.findMany({
    where: whereClause,
    orderBy: [desc(schema.users.createdAt)],
    limit,
    columns: {
      id: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
    },
  });

  res.json(rows);
});

// GET /api/admin/users/count — total de usuarios
adminUsersRouter.get("/count", async (_req, res) => {
  const db = getDb();
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.users);
  res.json({ total: row?.n ?? 0 });
});
