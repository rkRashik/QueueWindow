import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { createClient, type Client } from "@libsql/client";
import { migrate } from "../src/lib/db";
import {
  createQueue,
  mutateQueue,
  queueSnapshot,
  visitorSnapshot,
  publicSnapshot,
  joinQueue,
} from "../src/lib/queue";
import { allowedTransition } from "../src/lib/domain";
import { randomUUID } from "node:crypto";

let db: Client;
let id: string;
const command = (action: string, rest = {}) => ({
  action,
  key: randomUUID(),
  ...rest,
});
beforeEach(async () => {
  process.env.APP_SECRET = "test-secret-that-is-at-least-thirty-two-characters";
  db = createClient({ url: ":memory:" });
  await migrate(db);
  id = await createQueue(db, true);
});
afterEach(() => db.close());

describe("ticket rules", () => {
  it("permits only explicit lifecycle transitions", () => {
    expect(allowedTransition("waiting", "called")).toBe(true);
    expect(allowedTransition("called", "serving")).toBe(true);
    expect(allowedTransition("serving", "completed")).toBe(true);
    expect(allowedTransition("completed", "waiting")).toBe(false);
    expect(allowedTransition("waiting", "completed")).toBe(false);
  });
});
describe("database behavior", () => {
  it("gates public admission, allocates FIFO numbers, and safely retries after pausing", async () => {
    const initial = await queueSnapshot(db, id);
    const key = randomUUID();
    await expect(joinQueue(db, initial.displayId, key)).rejects.toThrow();
    await mutateQueue(
      db,
      id,
      command("settings", {
        version: initial.version,
        name: "Reception",
        desk: "Desk 01",
        message: "",
        preferences: { ...initial.preferences, selfService: true },
      }),
    );
    await mutateQueue(db, id, command("issue"));
    const result = await joinQueue(db, initial.displayId, key);
    expect(result.number).toBe(2);
    expect((await visitorSnapshot(db, result.token)).ahead).toBe(1);
    const after = await queueSnapshot(db, id);
    await mutateQueue(db, id, command("pause", { version: after.version }));
    expect(await joinQueue(db, initial.displayId, key)).toEqual(result);
    await expect(
      joinQueue(db, initial.displayId, randomUUID()),
    ).rejects.toThrow();
    expect((await queueSnapshot(db, id)).tickets).toHaveLength(2);
  });
  it("issues unique numbers and replays a command without duplicating", async () => {
    const c = command("issue");
    const a = await mutateQueue(db, id, c);
    expect(await mutateQueue(db, id, c)).toEqual(a);
    const b = await mutateQueue(db, id, command("issue"));
    expect(b.ticket!.number).toBe(a.ticket!.number + 1);
    expect((await queueSnapshot(db, id)).tickets).toHaveLength(2);
  });
  it("rejects key reuse with a different payload", async () => {
    const c = command("issue");
    await mutateQueue(db, id, c);
    await expect(
      mutateQueue(db, id, { ...c, action: "pause" }),
    ).rejects.toThrow("different");
  });
  it("calls FIFO, prevents a second active ticket, and completes the journey", async () => {
    const first = await mutateQueue(db, id, command("issue"));
    const second = await mutateQueue(db, id, command("issue"));
    await mutateQueue(db, id, command("call", { version: 2 }));
    await expect(
      mutateQueue(db, id, command("call", { version: 2 })),
    ).rejects.toThrow();
    expect((await visitorSnapshot(db, second.token!)).ahead).toBe(1);
    await mutateQueue(
      db,
      id,
      command("start", { ticketId: first.ticket!.id, version: 3 }),
    );
    await mutateQueue(
      db,
      id,
      command("complete", { ticketId: first.ticket!.id, version: 4 }),
    );
    expect((await visitorSnapshot(db, second.token!)).ahead).toBe(0);
  });
  it("rejects another queue ticket and does not change either queue", async () => {
    const other = await createQueue(db, true);
    const t = await mutateQueue(db, other, command("issue"));
    await expect(
      mutateQueue(
        db,
        id,
        command("cancel", { ticketId: t.ticket!.id, version: 0 }),
      ),
    ).rejects.toThrow();
    expect((await queueSnapshot(db, other)).tickets[0].state).toBe("waiting");
  });
  it("pauses admission while allowing existing tickets to be served", async () => {
    await mutateQueue(db, id, command("issue"));
    await mutateQueue(db, id, command("pause", { version: 1 }));
    await expect(mutateQueue(db, id, command("issue"))).rejects.toThrow(
      "paused",
    );
    await mutateQueue(db, id, command("call", { version: 2 }));
    expect((await queueSnapshot(db, id)).tickets[0].state).toBe("called");
  });
  it("never exposes private ticket IDs or tokens on the display", async () => {
    await mutateQueue(db, id, command("issue"));
    const q = await queueSnapshot(db, id);
    const view = await publicSnapshot(db, q.displayId);
    expect(JSON.stringify(view)).not.toContain("token");
    expect(JSON.stringify(view)).not.toContain(q.tickets[0].id);
    await expect(visitorSnapshot(db, "bad-token")).rejects.toThrow();
  });
  it("persists committed data across independent reads and expires demo access", async () => {
    const t = await mutateQueue(db, id, command("issue"));
    expect((await visitorSnapshot(db, t.token!)).ticket.number).toBe(1);
    await db.execute({
      sql: "UPDATE queues SET expires_at = 1 WHERE id = ?",
      args: [id],
    });
    await expect(queueSnapshot(db, id)).rejects.toThrow("expired");
    await expect(visitorSnapshot(db, t.token!)).rejects.toThrow();
  });
});
