import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  numeric,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 50 }),
  authProvider: varchar("auth_provider", { length: 50 }).notNull().default("guest"),
  role: varchar("role", { length: 20 }).notNull().default("CLIENT"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

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
  orderId: uuid("order_id").notNull().references(() => orders.id),
  grossAmount: numeric("gross_amount", { precision: 10, scale: 2 }).notNull(),
  platformFee: numeric("platform_fee", { precision: 10, scale: 2 }).notNull(),
  netAmount: numeric("net_amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 30 }).notNull().default("PENDIENTE"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  addresses: many(userAddresses),
}));

export const providersRelations = relations(providers, ({ many }) => ({
  orders: many(orders),
  payouts: many(providerPayouts),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  provider: one(providers, { fields: [orders.providerId], references: [providers.id] }),
  statusHistory: many(orderStatusHistory),
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
