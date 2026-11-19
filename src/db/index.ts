import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";

function connect() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required.");

  const pool = new Pool({ connectionString, connectionTimeoutMillis: 10_000 });
  pool.on("error", () =>
    console.error("QueueWindow database pool connection closed unexpectedly"),
  );
  return drizzle({ client: pool });
}

const cache = globalThis as typeof globalThis & {
  queueWindowDb?: ReturnType<typeof connect>;
};

export function getDb() {
  return (cache.queueWindowDb ??= connect());
}
