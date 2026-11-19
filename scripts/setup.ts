import { database, migrate } from "../src/lib/db";
import { createQueue } from "../src/lib/queue";
import { existsSync } from "node:fs";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
async function setup() {
  const db = await database();
  await migrate(db);
  await createQueue(db, false, "owner");
  console.log("Database schema and staff queue are ready.");
  db.close();
}
setup().catch(() => {
  console.error(
    "Database setup failed. Check the database URL and credentials.",
  );
  process.exitCode = 1;
});
