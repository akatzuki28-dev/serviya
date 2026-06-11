import { Router } from "express";
import { z } from "zod";
import { getDb, schema } from "@sp/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";
import { bookingRateLimiter } from "../middlewares/rateLimiter";
import { getPaymentService, resolveProvider } from "../services/payment";
import { PricingService } from "../services/PricingService";
import { NotificationService } from "../services/NotificationService";

export const ordersRouter = Router();
// Proveedor activo del piloto (Mobbex por defecto; MP si la cuenta se reactiva).
const paymentProvider = resolveProvider();
const paymentService = getPaymentService(paymentProvider);

const createOrderSchema = z.object({
  serviceType: z.string().min(1),
  scheduledAt: z.string().datetime(),
  zone: z.string().optional(),
  extras: z.array(z.string()).optional(),
  addressId: z.string().uuid().optional(),
  addressSnapshot: z
    .object({
      street: z.string(),
      city: z.string(),
    })
    .optional(),
  // Cualquier método distinto de "transfer" se cobra online con el proveedor
  // activo (PAYMENT_PROVIDER). Los tokens previos (mp_link/mobbex) se mantienen
  // por compatibilidad con clientes cacheados.
  paymentMethod: z.enum(["uala", "mobbex", "mp_link", "transfer"]),
  clientNotes: z.string().max(500).optional(),
  guestEmail: z.string().email().optional(),
  guestPhone: z.string().optional(),
});

// POST /api/orders — crear orden (guest o autenticado)
ordersRouter.post("/", bookingRateLimiter, async (req: AuthRequest, res) => {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const data = parsed.data;
  const db = getDb();

  try {
    const quote = await PricingService.quote({
      serviceType: data.serviceType,
      zone: data.zone,
      extras: data.extras,
    });

    // Resolver userId: autenticado o guest
    let userId: string | null = req.user?.id ?? null;

    if (!userId && data.guestEmail) {
      // Crear/recuperar usuario guest. Siempre tocamos updatedAt para que el
      // SET nunca quede vacío (Drizzle tira "No values to set" si lo es).
      const [guestUser] = await db
        .insert(schema.users)
        .values({
          email: data.guestEmail,
          phone: data.guestPhone ?? null,
          authProvider: "guest",
        })
        .onConflictDoUpdate({
          target: schema.users.email,
          set: {
            updatedAt: new Date(),
            ...(data.guestPhone ? { phone: data.guestPhone } : {}),
          },
        })
        .returning({ id: schema.users.id });
      userId = guestUser?.id ?? null;
    }

    const [order] = await db
      .insert(schema.orders)
      .values({
        userId,
        serviceType: data.serviceType,
        scheduledAt: new Date(data.scheduledAt),
        addressId: data.addressId,
        addressSnapshot: data.addressSnapshot,
        status: "PENDIENTE_PAGO",
        grossAmount: String(quote.total),
        platformFee: String(quote.platformFee),
        netAmount: String(quote.netToProvider),
        paymentMethod: data.paymentMethod,
        clientNotes: data.clientNotes,
      })
      .returning();

    if (!order) throw new Error("Failed to create order");

    // Registrar en historial
    await db.insert(schema.orderStatusHistory).values({
      orderId: order.id,
      status: "PENDIENTE_PAGO",
      changedBy: "system",
    });

    let paymentUrl: string | null = null;

    if (data.paymentMethod !== "transfer") {
      const link = await paymentService.createPaymentLink(order);
      await db
        .update(schema.orders)
        .set({
          paymentProvider,
          gatewayPreferenceId: link.externalId,
          // Mantenemos mpPreferenceId si el proveedor activo sigue siendo MP.
          ...(paymentProvider === "mp" ? { mpPreferenceId: link.externalId } : {}),
        })
        .where(eq(schema.orders.id, order.id));
      paymentUrl = link.url;
    }

    // Notificación de link de pago por WA
    if (data.guestPhone && paymentUrl) {
      const clientName = data.guestEmail?.split("@")[0] ?? "Cliente";
      await NotificationService.paymentLink(
        data.guestPhone,
        clientName,
        data.serviceType,
        paymentUrl,
        "48 horas"
      );
    }

    res.status(201).json({
      order,
      paymentUrl,
      quote,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear la orden" });
  }
});

// GET /api/orders/:id — detalle de orden (propietario, admin, o proveedor asignado)
ordersRouter.get("/:id", requireAuth, async (req: AuthRequest, res) => {
  const db = getDb();
  const order = await db.query.orders.findFirst({
    where: eq(schema.orders.id, req.params["id"] as string),
    with: { provider: true },
  });

  if (!order) {
    res.status(404).json({ error: "Orden no encontrada" });
    return;
  }

  // Row-level security
  if (
    req.user?.role !== "ADMIN" &&
    order.userId !== req.user?.id &&
    order.providerId !== req.user?.id
  ) {
    res.status(403).json({ error: "Acceso denegado" });
    return;
  }

  res.json(order);
});

// PATCH /api/orders/:id/status — cambio de estado
ordersRouter.patch(
  "/:id/status",
  requireAuth,
  async (req: AuthRequest, res) => {
    // safeParse (no parse): un status inválido devuelve 400, en vez de tirar
    // dentro de un handler async (Express 4 no captura el throw → cuelga el req).
    const parsed = z
      .object({
        status: z.enum([
          "CONFIRMADA",
          "EN_CAMINO",
          "EN_PROGRESO",
          "COMPLETADA",
          "CANCELADA",
        ]),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const { status } = parsed.data;

    const db = getDb();
    const [updated] = await db
      .update(schema.orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(schema.orders.id, req.params["id"] as string))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Orden no encontrada" });
      return;
    }

    await db.insert(schema.orderStatusHistory).values({
      orderId: updated.id,
      status,
      changedBy: req.user?.role === "ADMIN" ? "admin" : "provider",
    });

    res.json(updated);
  }
);

// GET /api/orders — listar órdenes (admin)
ordersRouter.get(
  "/",
  requireAuth,
  requireRole("ADMIN"),
  async (_req, res) => {
    const db = getDb();
    const orders = await db.query.orders.findMany({
      orderBy: [desc(schema.orders.createdAt)],
      with: { provider: true },
      limit: 100,
    });
    res.json(orders);
  }
);
