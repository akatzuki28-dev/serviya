import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export * from "./schema";

let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!_db) {
    const pool = new Pool({
      connectionString: process.env["DATABASE_URL"],
      ssl:
        process.env["NODE_ENV"] === "production"
          ? { rejectUnauthorized: false }
          : false,
    });
    _db = drizzle(pool, { schema });
  }
  return _db;
}

export { schema };
