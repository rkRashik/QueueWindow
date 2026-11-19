import { createClient, type Client, type Transaction } from "@libsql/client";
import { mkdirSync } from "node:fs";

const schema = [
  `CREATE TABLE IF NOT EXISTS queues (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, desk TEXT NOT NULL, message TEXT NOT NULL,
    paused INTEGER NOT NULL DEFAULT 0 CHECK(paused IN (0,1)), version INTEGER NOT NULL DEFAULT 0,
    next_number INTEGER NOT NULL DEFAULT 1, display_id TEXT NOT NULL UNIQUE,
    demo INTEGER NOT NULL CHECK(demo IN (0,1)), expires_at INTEGER, created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY, queue_id TEXT NOT NULL REFERENCES queues(id) ON DELETE CASCADE,
    number INTEGER NOT NULL, state TEXT NOT NULL CHECK(state IN ('waiting','called','serving','completed','absent','cancelled')),
    token_hash TEXT NOT NULL UNIQUE, issued_at INTEGER NOT NULL, finished_at INTEGER,
    UNIQUE(queue_id, number)
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS one_active_ticket ON tickets(queue_id) WHERE state IN ('called','serving')`,
  `CREATE INDEX IF NOT EXISTS queue_order ON tickets(queue_id, state, number)`,
  `CREATE TABLE IF NOT EXISTS commands (
    queue_id TEXT NOT NULL REFERENCES queues(id) ON DELETE CASCADE, key TEXT NOT NULL, payload_hash TEXT NOT NULL,
    result TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY(queue_id, key)
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY, queue_id TEXT NOT NULL REFERENCES queues(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT, queue_id TEXT NOT NULL REFERENCES queues(id) ON DELETE CASCADE,
    action TEXT NOT NULL, ticket_id TEXT, created_at INTEGER NOT NULL
  )`,
];
export async function migrate(db: Client) {
  await db.batch(schema, "write");
}
let writeTail: Promise<unknown> = Promise.resolve();
export async function serializeWrite<T>(work: () => Promise<T>): Promise<T> {
  // Avoid contending synchronous native SQLite connections in one JS process.
  // Database transactions still enforce correctness across server instances.
  const result = writeTail.then(work, work);
  writeTail = result.catch(() => undefined);
  return result;
}
export async function beginWrite(db: Client): Promise<Transaction> {
  // Yield between lock attempts: a synchronous SQLite busy wait blocks the
  // JavaScript task that needs to commit the competing local transaction.
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.transaction("write");
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (
        attempt >= 40 ||
        !["SQLITE_BUSY", "SQLITE_BUSY_SNAPSHOT", "TRANSACTION_ACTIVE"].includes(
          code || "",
        )
      )
        throw error;
      await new Promise((resolve) => setTimeout(resolve, 10 + attempt * 2));
    }
  }
}
let instance: Promise<Client> | undefined;
export function database(): Promise<Client> {
  if (!instance)
    instance = (async () => {
      const url = process.env.TURSO_DATABASE_URL;
      if (process.env.VERCEL && (!url || url.startsWith("file:")))
        throw new Error("Vercel requires a remote Turso database.");
      if (!url) mkdirSync("data", { recursive: true });
      const db = createClient({
        url: url || "file:data/queuewindow.db",
        authToken: process.env.TURSO_AUTH_TOKEN,
        timeout: 1,
      });
      if (!url || url.startsWith("file:")) {
        await db.execute("PRAGMA journal_mode=WAL");
        await migrate(db);
      }
      return db;
    })().catch((error) => {
      instance = undefined;
      throw error;
    });
  return instance;
}
