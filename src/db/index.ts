import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

export type Database = PgDatabase<PgQueryResultHKT>;
export type QueueTransaction = Parameters<
  Parameters<Database["transaction"]>[0]
>[0];

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

export function getDb(): Database {
  return (cache.queueWindowDb ??= connect());
}
