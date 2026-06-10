import { Router } from "express";
import { getDb, schema } from "@sp/db";
import { sql, eq, gte, isNotNull, desc } from "drizzle-orm";
import { requireAdminSecret } from "../../middlewares/adminSecret";

export const adminMetricsRouter = Router();

adminMetricsRouter.use(requireAdminSecret);

// GET /api/admin/metrics — agregados para el dashboard admin
adminMetricsRouter.get("/", async (_req, res) => {
  const db = getDb();
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    ordersByStatus,
    usersByRole,
    revenueAll,
    revenue30,
    topServices,
    topProviders,
  ] = await Promise.all([
    // Total de órdenes por estado
    db
      .select({
        status: schema.orders.status,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.orders)
      .groupBy(schema.orders.status),

    // Usuarios por rol
    db
      .select({
        role: schema.users.role,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.users)
      .groupBy(schema.users.role),

    // Ingresos totales (todas las órdenes)
    db
      .select({
        gross: sql<string>`coalesce(sum(${schema.orders.grossAmount}), 0)`,
        fee: sql<string>`coalesce(sum(${schema.orders.platformFee}), 0)`,
        net: sql<string>`coalesce(sum(${schema.orders.netAmount}), 0)`,
      })
      .from(schema.orders),

    // Ingresos últimos 30 días
    db
      .select({
        gross: sql<string>`coalesce(sum(${schema.orders.grossAmount}), 0)`,
        fee: sql<string>`coalesce(sum(${schema.orders.platformFee}), 0)`,
        net: sql<string>`coalesce(sum(${schema.orders.netAmount}), 0)`,
      })
      .from(schema.orders)
      .where(gte(schema.orders.createdAt, since30)),

    // Top servicios por cantidad de órdenes
    db
      .select({
        serviceType: schema.orders.serviceType,
        count: sql<number>`count(*)::int`,
        gross: sql<string>`coalesce(sum(${schema.orders.grossAmount}), 0)`,
      })
      .from(schema.orders)
      .groupBy(schema.orders.serviceType)
      .orderBy(desc(sql`count(*)`))
      .limit(5),

    // Top proveedores por cantidad de órdenes (con nombre)
    db
      .select({
        providerId: schema.orders.providerId,
        name: schema.providers.name,
        count: sql<number>`count(*)::int`,
        net: sql<string>`coalesce(sum(${schema.orders.netAmount}), 0)`,
      })
      .from(schema.orders)
      .innerJoin(
        schema.providers,
        eq(schema.orders.providerId, schema.providers.id)
      )
      .where(isNotNull(schema.orders.providerId))
      .groupBy(schema.orders.providerId, schema.providers.name)
      .orderBy(desc(sql`count(*)`))
      .limit(5),
  ]);

  const totalOrders = ordersByStatus.reduce((acc, r) => acc + r.count, 0);
  const totalUsers = usersByRole.reduce((acc, r) => acc + r.count, 0);

  res.json({
    totalOrders,
    ordersByStatus: Object.fromEntries(
      ordersByStatus.map((r) => [r.status, r.count])
    ),
    totalUsers,
    usersByRole: Object.fromEntries(usersByRole.map((r) => [r.role, r.count])),
    revenue: {
      allTime: revenueAll[0] ?? { gross: "0", fee: "0", net: "0" },
      last30Days: revenue30[0] ?? { gross: "0", fee: "0", net: "0" },
    },
    topServices,
    topProviders,
  });
});
