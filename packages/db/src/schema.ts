import {
  pgTable,
  uuid,
  text,
  boolean,
  numeric,
  integer,
  timestamp,
  jsonb,
  pgEnum,
  index,
  unique,
  point,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ── Enums ──────────────────────────────────────────────────────────────────────

export const authProviderEnum = pgEnum("auth_provider", [
  "google",
  "email",
  "guest",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "PENDIENTE_PAGO",
  "PAGADA",
  "CONFIRMADA",
  "EN_CAMINO",
  "EN_PROGRESO",
  "COMPLETADA",
  "CANCELADA",
  "PAGO_FALLIDO",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "mp_link",
  "transfer",
]);

export const payoutStatusEnum = pgEnum("payout_status", [
  "PENDIENTE",
  "PAGADO",
]);

export const changedByEnum = pgEnum("changed_by", [
  "system",
  "admin",
  "provider",
  "client",
]);

// ── Tablas ────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique().notNull(),
  name: text("name"),
  phone: text("phone"),
  passwordHash: text("password_hash"),
  role: text("role").notNull().default("CLIENT"), // CLIENT | ADMIN | PROVIDER
  authProvider: authProviderEnum("auth_provider"),
  notificationPreferences: jsonb("notification_preferences")
    .default(sql`'{"whatsapp": true, "email": true}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const userAddresses = pgTable(
  "user_addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    label: text("label"), // 'Casa', 'Trabajo', etc.
    street: text("street").notNull(),
    city: text("city").notNull(),
    coordinates: point("coordinates"),
    isDefault: boolean("is_default").default(false),
  },
  (t) => [index("idx_user_addresses_user").on(t.userId)]
);

export const providers = pgTable("providers", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  name: text("name").notNull(),
  phone: text("phone"),
  serviceCategories: text("service_categories").array(), // ['limpieza', 'plomeria']
  coverageZones: text("coverage_zones").array(), // barrios o zonas
  isActive: boolean("is_active").default(true),
  rating: numeric("rating", { precision: 3, scale: 2 }),
  totalReviews: integer("total_reviews").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const servicePricing = pgTable("service_pricing", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceType: text("service_type").notNull(),
  zone: text("zone"), // null = precio base sin zona
  basePrice: numeric("base_price", { precision: 12, scale: 2 }).notNull(),
  extras: jsonb("extras").default(sql`'[]'::jsonb`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
},
(t) => [
  unique("uq_service_pricing").on(t.serviceType, t.zone),
]);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id),
    providerId: uuid("provider_id").references(() => providers.id),
    serviceType: text("service_type").notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    addressId: uuid("address_id").references(() => userAddresses.id),
    addressSnapshot: jsonb("address_snapshot"), // copia al momento de la orden
    status: orderStatusEnum("status").notNull().default("PENDIENTE_PAGO"),
    grossAmount: numeric("gross_amount", { precision: 12, scale: 2 }).notNull(),
    platformFee: numeric("platform_fee", { precision: 12, scale: 2 }),
    netAmount: numeric("net_amount", { precision: 12, scale: 2 }),
    paymentMethod: paymentMethodEnum("payment_method"),
    mpPreferenceId: text("mp_preference_id"),
    mpPaymentId: text("mp_payment_id").unique(),
    clientNotes: text("client_notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("idx_orders_user_created").on(t.userId, t.createdAt),
    index("idx_orders_provider_scheduled").on(t.providerId, t.scheduledAt),
    index("idx_orders_status").on(t.status),
  ]
);

export const orderStatusHistory = pgTable(
  "order_status_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    changedAt: timestamp("changed_at", { withTimezone: true }).defaultNow(),
    changedBy: changedByEnum("changed_by"),
  },
  (t) => [index("idx_order_status_history_order").on(t.orderId)]
);

export const providerPayouts = pgTable(
  "provider_payouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerId: uuid("provider_id").references(() => providers.id),
    orderId: uuid("order_id").references(() => orders.id),
    grossAmount: numeric("gross_amount", { precision: 12, scale: 2 }),
    platformFee: numeric("platform_fee", { precision: 12, scale: 2 }),
    netAmount: numeric("net_amount", { precision: 12, scale: 2 }),
    status: payoutStatusEnum("status").default("PENDIENTE"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    transferProofUrl: text("transfer_proof_url"),
  },
  (t) => [index("idx_payouts_provider_status").on(t.providerId, t.status)]
);

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .references(() => orders.id)
      .unique(),
    userId: uuid("user_id").references(() => users.id),
    providerId: uuid("provider_id").references(() => providers.id),
    rating: integer("rating").notNull(),
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    check("chk_rating", sql`${t.rating} BETWEEN 1 AND 5`),
  ]
);

// ── Tipos inferidos ───────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type Provider = typeof providers.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type ProviderPayout = typeof providerPayouts.$inferSelect;
export type UserAddress = typeof userAddresses.$inferSelect;
