import { Pool as NeonPool } from "@neondatabase/serverless";
import { drizzle as neonDrizzle } from "drizzle-orm/neon-serverless";
import { drizzle as pgDrizzle } from "drizzle-orm/node-postgres";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { Pool as PgPool } from "pg";

export type Database = PgDatabase<PgQueryResultHKT>;
export type QueueTransaction = Parameters<
  Parameters<Database["transaction"]>[0]
>[0];

const loopback = ["127.0.0.1", "localhost", "[::1]"];

function connect(): Database {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required.");

  // Neon's driver speaks WebSockets, which a plain local Postgres (tests, offline dev) does not.
  const local = loopback.includes(new URL(connectionString).hostname);
  const options = { connectionString, connectionTimeoutMillis: 10_000 };
  const pool = local ? new PgPool(options) : new NeonPool(options);
  pool.on("error", () =>
    console.error("QueueWindow database pool connection closed unexpectedly"),
  );
  return local
    ? pgDrizzle({ client: pool as PgPool })
    : neonDrizzle({ client: pool as NeonPool });
}

const cache = globalThis as typeof globalThis & {
  queueWindowDb?: Database;
};

export function getDb(): Database {
  return (cache.queueWindowDb ??= connect());
}
