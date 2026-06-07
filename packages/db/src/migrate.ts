import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import "dotenv/config";

async function main() {
  const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
  const db = drizzle(pool);

  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: "./src/migrations" });
  console.log("Migrations complete.");

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
