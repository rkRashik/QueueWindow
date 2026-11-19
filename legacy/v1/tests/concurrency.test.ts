import { it, expect } from "vitest";
import { createClient } from "@libsql/client";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { migrate } from "../src/lib/db";
import { createQueue, mutateQueue, queueSnapshot } from "../src/lib/queue";
it("serializes simultaneous issuance and competing call-next commands, and survives reopening", async () => {
  process.env.APP_SECRET = "test-secret-that-is-at-least-thirty-two-characters";
  const folder = await mkdtemp(join(tmpdir(), "qw-test-"));
  const url = `file:${join(folder, "queue.db").replaceAll("\\", "/")}`;
  const a = createClient({ url, timeout: 1, concurrency: 1 });
  const b = createClient({ url, timeout: 1, concurrency: 1 });
  try {
    await migrate(a);
    await a.execute("PRAGMA journal_mode=WAL");
    const id = await createQueue(a, true);
    const results = await Promise.allSettled(
      Array.from({ length: 12 }, (_, i) =>
        mutateQueue(i % 2 ? a : b, id, { action: "issue", key: randomUUID() }),
      ),
    );
    const failures = results.filter((r) => r.status === "rejected");
    expect(failures.map((r) => r.reason?.message)).toEqual([]);
    expect(
      new Set(
        results
          .filter((r) => r.status === "fulfilled")
          .map((r) => r.value.ticket!.number),
      ).size,
    ).toBe(12);
    const calls = await Promise.allSettled(
      [a, b].map((db) =>
        mutateQueue(db, id, { action: "call", key: randomUUID(), version: 12 }),
      ),
    );
    expect(calls.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    a.close();
    b.close();
    const reopened = createClient({ url });
    try {
      const q = await queueSnapshot(reopened, id);
      expect(q.tickets).toHaveLength(12);
      expect(q.tickets.filter((t) => t.state === "called")).toHaveLength(1);
    } finally {
      reopened.close();
    }
    // The native Windows driver may retain a file handle until process exit.
    // Keep this unique OS-temp fixture rather than masking assertions with EBUSY.
  } finally {
    a.close();
    b.close();
  }
}, 30000);
