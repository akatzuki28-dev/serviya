import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  numeric,
  jsonb,
  integer,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 50 }),
  authProvider: varchar("auth_provider", { length: 50 }).notNull().default("guest"),
  role: varchar("role", { length: 20 }).notNull().default("CLIENT"),
  // Columnas requeridas por @auth/drizzle-adapter (Next-Auth v5).
  name: varchar("name", { length: 255 }),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Tabla requerida por DrizzleAdapter para enlazar cuentas OAuth (Google, etc).
export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 50 }).notNull(),
    provider: varchar("provider", { length: 100 }).notNull(),
    providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: varchar("token_type", { length: 50 }),
    scope: varchar("scope", { length: 255 }),
    id_token: text("id_token"),
    session_state: varchar("session_state", { length: 255 }),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const providers = pgTable("providers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  serviceCategories: jsonb("service_categories").$type<string[]>().default([]),
  coverageZones: jsonb("coverage_zones").$type<string[]>().default([]),
  isActive: boolean("is_active").notNull().default(true),
  userId: uuid("user_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  providerId: uuid("provider_id").references(() => providers.id),
  serviceType: varchar("service_type", { length: 100 }).notNull(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  addressId: uuid("address_id"),
  addressSnapshot: jsonb("address_snapshot").$type<{ street: string; city: string }>(),
  status: varchar("status", { length: 30 }).notNull().default("PENDIENTE_PAGO"),
  grossAmount: numeric("gross_amount", { precision: 10, scale: 2 }).notNull(),
  platformFee: numeric("platform_fee", { precision: 10, scale: 2 }).notNull(),
  netAmount: numeric("net_amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 20 }).notNull(),
  clientNotes: text("client_notes"),
  mpPreferenceId: varchar("mp_preference_id", { length: 255 }),
  mpPaymentId: varchar("mp_payment_id", { length: 255 }),
  // Columnas genéricas de pasarela (Mobbex y futuros proveedores). No atadas a
  // MP: paymentProvider identifica quién procesó ("mp" | "mobbex"), y los dos
  // gateway* guardan el id del checkout y del pago del proveedor activo.
  paymentProvider: varchar("payment_provider", { length: 20 }),
  gatewayPreferenceId: varchar("gateway_preference_id", { length: 255 }),
  gatewayPaymentId: varchar("gateway_payment_id", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderStatusHistory = pgTable("order_status_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().references(() => orders.id),
  status: varchar("status", { length: 30 }).notNull(),
  changedBy: varchar("changed_by", { length: 50 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const servicePricing = pgTable("service_pricing", {
  id: uuid("id").defaultRandom().primaryKey(),
  serviceType: varchar("service_type", { length: 100 }).notNull(),
  zone: varchar("zone", { length: 100 }),
  basePrice: numeric("base_price", { precision: 10, scale: 2 }).notNull(),
  extras: jsonb("extras").$type<{ id: string; label: string; price: number }[]>().default([]),
  comingSoon: boolean("coming_soon").notNull().default(false),
  description: text("description"),
});

export const userAddresses = pgTable("user_addresses", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  label: varchar("label", { length: 50 }),
  street: varchar("street", { length: 200 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const providerPayouts = pgTable("provider_payouts", {
  id: uuid("id").defaultRandom().primaryKey(),
  providerId: uuid("provider_id").notNull().references(() => providers.id),
  // Una liquidación por orden: índice único que endurece contra duplicados
  // (reintentos de webhook, doble click en "Generar", etc.).
  orderId: uuid("order_id").notNull().references(() => orders.id).unique(),
  grossAmount: numeric("gross_amount", { precision: 10, scale: 2 }).notNull(),
  platformFee: numeric("platform_fee", { precision: 10, scale: 2 }).notNull(),
  netAmount: numeric("net_amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 30 }).notNull().default("PENDIENTE"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  orderId: uuid("order_id").notNull().references(() => orders.id),
  providerId: uuid("provider_id").references(() => providers.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  addresses: many(userAddresses),
  reviews: many(reviews),
}));

export const providersRelations = relations(providers, ({ many }) => ({
  orders: many(orders),
  payouts: many(providerPayouts),
  reviews: many(reviews),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  provider: one(providers, { fields: [orders.providerId], references: [providers.id] }),
  statusHistory: many(orderStatusHistory),
  review: one(reviews, { fields: [orders.id], references: [reviews.orderId] }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  user: one(users, { fields: [reviews.userId], references: [users.id] }),
  order: one(orders, { fields: [reviews.orderId], references: [orders.id] }),
  provider: one(providers, { fields: [reviews.providerId], references: [providers.id] }),
}));

export const orderStatusHistoryRelations = relations(orderStatusHistory, ({ one }) => ({
  order: one(orders, { fields: [orderStatusHistory.orderId], references: [orders.id] }),
}));

export const userAddressesRelations = relations(userAddresses, ({ one }) => ({
  user: one(users, { fields: [userAddresses.userId], references: [users.id] }),
}));

export const providerPayoutsRelations = relations(providerPayouts, ({ one }) => ({
  provider: one(providers, { fields: [providerPayouts.providerId], references: [providers.id] }),
  order: one(orders, { fields: [providerPayouts.orderId], references: [orders.id] }),
}));
