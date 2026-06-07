import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export { schema };
export * from "./schema";

export type Order = typeof schema.orders.$inferSelect;
export type User = typeof schema.users.$inferSelect;
export type Provider = typeof schema.providers.$inferSelect;

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!db) {
    const pool = new Pool({
      connectionString: process.env["DATABASE_URL"],
    });
    db = drizzle(pool, { schema });
  }
  return db;
}
