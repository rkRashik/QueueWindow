import type { Client, Row, Transaction } from "@libsql/client";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  AppError,
  defaultPreferences,
  displayThemes,
  chimeStyles,
  type AdmissionView,
  type PublicTicket,
  allowedTransition,
  isActive,
  type Queue,
  type Ticket,
  type TicketState,
  type Snapshot,
  type VisitorView,
  type DisplayView,
} from "./domain";
import { hash, ticketToken } from "./crypto";
import { beginWrite, serializeWrite } from "./db";

const commandSchema = z.object({
  action: z.enum([
    "issue",
    "call",
    "recall",
    "start",
    "complete",
    "absent",
    "cancel",
    "pause",
    "resume",
    "settings",
    "new-day",
  ]),
  key: z.string().uuid(),
  version: z.number().int().nonnegative().optional(),
  ticketId: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(60).optional(),
  desk: z.string().trim().min(1).max(30).optional(),
  message: z.string().trim().max(140).optional(),
  preferences: z
    .object({
      theme: z.enum(displayThemes),
      chimeStyle: z.enum(chimeStyles).default(defaultPreferences.chimeStyle),
      displayLanguage: z.enum(["en", "bn"]).default("en"),
      showTiming: z.boolean().default(false),
      serviceTarget: z.number().int().min(0).max(120).default(0),
      selfService: z.boolean().default(false),
      upcoming: z.number().int().min(0).max(4),
      chime: z.boolean(),
      printFooter: z.string().trim().max(100),
      pauseMessage: z.string().trim().max(140),
    })
    .optional(),
});
type Result = { ticket?: Ticket; token?: string };
const ticketFrom = (r: Row): Ticket => ({
  id: String(r.id),
  number: Number(r.number),
  state: r.state as TicketState,
  issuedAt: Number(r.issued_at),
  finishedAt: r.finished_at === null ? null : Number(r.finished_at),
});
function queueFrom(r?: Row): Queue {
  if (!r || (r.expires_at !== null && Number(r.expires_at) < Date.now()))
    throw new AppError("This queue is unavailable or expired.", 404);
  return {
    preferences: defaultPreferences,
    id: String(r.id),
    name: String(r.name),
    desk: String(r.desk),
    message: String(r.message),
    paused: !!r.paused,
    version: Number(r.version),
    displayId: String(r.display_id),
    demo: !!r.demo,
    expiresAt: r.expires_at === null ? null : Number(r.expires_at),
  };
}
export async function createQueue(db: Client, demo: boolean, fixedId?: string) {
  return serializeWrite(() => createQueueRecord(db, demo, fixedId));
}
async function createQueueRecord(db: Client, demo: boolean, fixedId?: string) {
  const id = fixedId || randomUUID();
  await db.execute({
    sql: `INSERT OR IGNORE INTO queues(id,name,desk,message,display_id,demo,expires_at,created_at) VALUES(?,?,?,?,?,?,?,?)`,
    args: [
      id,
      demo ? "Juniper Studio" : "Your service desk",
      "Desk 01",
      "Make yourself comfortable. We’ll be with you soon.",
      randomUUID(),
      +demo,
      demo ? Date.now() + 86400000 : null,
      Date.now(),
    ],
  });
  return id;
}
export async function queueSnapshot(db: Client, id: string): Promise<Snapshot> {
  // A read transaction keeps the version and its tickets in the same snapshot.
  const tx = await db.transaction("read");
  try {
    const q = queueFrom(
      (await tx.execute({ sql: "SELECT * FROM queues WHERE id=?", args: [id] }))
        .rows[0],
    );
    const tickets = (
      await tx.execute({
        sql: "SELECT * FROM tickets WHERE queue_id=? ORDER BY number",
        args: [id],
      })
    ).rows.map(ticketFrom);
    const preference = (
      await tx.execute({
        sql: "SELECT value FROM queue_preferences WHERE queue_id=?",
        args: [id],
      })
    ).rows[0];
    if (preference)
      q.preferences = {
        ...defaultPreferences,
        ...JSON.parse(String(preference.value)),
      };
    const active = tickets.find((ticket) => isActive(ticket.state));
    const timing = active
      ? (
          await tx.execute({
            sql: "SELECT MAX(CASE WHEN action IN ('call','recall') THEN created_at END) AS called, MAX(CASE WHEN action='start' THEN created_at END) AS started FROM events WHERE queue_id=? AND ticket_id=?",
            args: [id, active.id],
          })
        ).rows[0]
      : undefined;
    return {
      ...q,
      tickets,
      updatedAt: Date.now(),
      calledAt: timing?.called == null ? null : Number(timing.called),
      startedAt: timing?.started == null ? null : Number(timing.started),
    };
  } finally {
    tx.close();
  }
}
export async function mutateQueue(
  db: Client,
  id: string,
  input: unknown,
): Promise<Result> {
  return serializeWrite(() => mutateQueueTransaction(db, id, input));
}
async function mutateQueueTransaction(
  db: Client,
  id: string,
  input: unknown,
  admission = false,
): Promise<Result> {
  const parsed = commandSchema.safeParse(input);
  if (!parsed.success) throw new AppError("Check the request and try again.");
  const c = parsed.data;
  const payloadHash = hash(JSON.stringify(c));
  const key = admission ? "join:" + c.key : c.key;
  // Write transactions serialize allocation and lifecycle checks at the database.
  const tx = await beginWrite(db);
  try {
    const q = queueFrom(
      (await tx.execute({ sql: "SELECT * FROM queues WHERE id=?", args: [id] }))
        .rows[0],
    );
    const previous = (
      await tx.execute({
        sql: "SELECT * FROM commands WHERE queue_id=? AND key=?",
        args: [id, key],
      })
    ).rows[0];
    if (previous) {
      if (previous.payload_hash !== payloadHash)
        throw new AppError(
          "This request key was used for a different action.",
          409,
        );
      const result: Result = JSON.parse(String(previous.result));
      if (result.ticket) {
        if (
          admission &&
          !(
            await tx.execute({
              sql: "SELECT id FROM tickets WHERE queue_id=? AND id=?",
              args: [id, result.ticket.id],
            })
          ).rows.length
        )
          throw new AppError("This ticket is no longer available.", 410);
        result.token = ticketToken(result.ticket.id);
      }
      return result;
    }
    if (c.action !== "issue" && c.version !== q.version)
      throw new AppError(
        "The queue changed in another window. Review the updated queue and try again.",
        409,
      );
    let result: Result = {};
    let eventTicketId = c.ticketId;
    if (c.action === "issue") {
      if (admission) {
        const preference = (
          await tx.execute({
            sql: "SELECT value FROM queue_preferences WHERE queue_id=?",
            args: [id],
          })
        ).rows[0];
        if (
          !preference ||
          JSON.parse(String(preference.value)).selfService !== true
        )
          throw new AppError(
            "Self-service is closed. Please ask at the desk.",
            409,
          );
      }
      if (q.paused)
        throw new AppError(
          "Ticket admission is paused. Resume the queue to issue a ticket.",
          409,
        );
      const row = (
        await tx.execute({
          sql: "SELECT next_number FROM queues WHERE id=?",
          args: [id],
        })
      ).rows[0];
      const number = Number(row.next_number);
      if (number > 500)
        throw new AppError(
          "This session has reached 500 tickets. Finish the queue and start a new day.",
          409,
        );
      const ticketId = randomUUID();
      const issued = Date.now();
      await tx.execute({
        sql: "INSERT INTO tickets(id,queue_id,number,state,token_hash,issued_at) VALUES(?,?,?,?,?,?)",
        args: [
          ticketId,
          id,
          number,
          "waiting",
          hash(ticketToken(ticketId)),
          issued,
        ],
      });
      await tx.execute({
        sql: "UPDATE queues SET next_number=next_number+1 WHERE id=?",
        args: [id],
      });
      result = {
        ticket: {
          id: ticketId,
          number,
          state: "waiting",
          issuedAt: issued,
          finishedAt: null,
        },
      };
    } else if (c.action === "pause" || c.action === "resume") {
      await tx.execute({
        sql: "UPDATE queues SET paused=? WHERE id=?",
        args: [+(c.action === "pause"), id],
      });
    } else if (c.action === "settings") {
      if (!c.name || !c.desk || c.message === undefined)
        throw new AppError(
          "Business name, desk, and welcome message are required.",
        );
      await tx.execute({
        sql: "UPDATE queues SET name=?,desk=?,message=? WHERE id=?",
        args: [c.name, c.desk, c.message, id],
      });
      if (c.preferences)
        await tx.execute({
          sql: "INSERT INTO queue_preferences(queue_id,value) VALUES(?,?) ON CONFLICT(queue_id) DO UPDATE SET value=excluded.value",
          args: [id, JSON.stringify(c.preferences)],
        });
    } else if (c.action === "new-day") {
      const active = (
        await tx.execute({
          sql: "SELECT id FROM tickets WHERE queue_id=? AND state IN ('waiting','called','serving') LIMIT 1",
          args: [id],
        })
      ).rows;
      if (active.length)
        throw new AppError(
          "Finish or cancel the remaining tickets before starting a new day.",
          409,
        );
      await tx.execute({
        sql: "DELETE FROM tickets WHERE queue_id=?",
        args: [id],
      });
      await tx.execute({
        sql: "UPDATE queues SET next_number=1,paused=0 WHERE id=?",
        args: [id],
      });
    } else {
      eventTicketId = await transition(tx, id, c.action, c.ticketId);
    }
    await tx.execute({
      sql: "UPDATE queues SET version=version+1 WHERE id=?",
      args: [id],
    });
    await tx.execute({
      sql: "INSERT INTO events(queue_id,action,ticket_id,created_at) VALUES(?,?,?,?)",
      args: [
        id,
        c.action,
        eventTicketId || result.ticket?.id || null,
        Date.now(),
      ],
    });
    await tx.execute({
      sql: "INSERT INTO commands(queue_id,key,payload_hash,result,created_at) VALUES(?,?,?,?,?)",
      args: [id, key, payloadHash, JSON.stringify(result), Date.now()],
    });
    await tx.commit();
    if (result.ticket) result.token = ticketToken(result.ticket.id);
    return result;
  } finally {
    tx.close();
  }
}
async function transition(
  tx: Transaction,
  id: string,
  action: string,
  ticketId?: string,
) {
  let row: Row | undefined;
  let to: TicketState;
  if (action === "call") {
    const active = await tx.execute({
      sql: "SELECT id FROM tickets WHERE queue_id=? AND state IN ('called','serving')",
      args: [id],
    });
    if (active.rows.length)
      throw new AppError(
        "Finish the current ticket before calling the next person.",
        409,
      );
    row = (
      await tx.execute({
        sql: "SELECT * FROM tickets WHERE queue_id=? AND state='waiting' ORDER BY number LIMIT 1",
        args: [id],
      })
    ).rows[0];
    to = "called";
  } else {
    row = (
      await tx.execute({
        sql: "SELECT * FROM tickets WHERE queue_id=? AND id=?",
        args: [id, ticketId || ""],
      })
    ).rows[0];
    const targets: Record<string, TicketState> = {
      recall: "called",
      start: "serving",
      complete: "completed",
      absent: "absent",
      cancel: "cancelled",
    };
    to = targets[action];
  }
  if (!row) throw new AppError("No matching ticket is available.", 404);
  if (action === "recall" && row.state === "called") return String(row.id);
  if (!allowedTransition(row.state as TicketState, to))
    throw new AppError(
      "That ticket has already changed. Refresh the queue.",
      409,
    );
  await tx.execute({
    sql: "UPDATE tickets SET state=?,finished_at=? WHERE id=? AND queue_id=?",
    args: [
      to,
      ["completed", "absent", "cancelled"].includes(to) ? Date.now() : null,
      String(row.id),
      id,
    ],
  });
  return String(row.id);
}
export async function visitorSnapshot(
  db: Client,
  token: string,
): Promise<VisitorView> {
  if (!/^[\w-]{43}$/.test(token))
    throw new AppError(
      "This ticket link is unavailable or expired. Ask the desk for a new ticket.",
      404,
    );
  const row = (
    await db.execute({
      sql: "SELECT queue_id,id FROM tickets WHERE token_hash=? AND issued_at>?",
      args: [hash(token), Date.now() - 86400000],
    })
  ).rows[0];
  if (!row)
    throw new AppError(
      "This ticket link is unavailable or expired. Ask the desk for a new ticket.",
      404,
    );
  const q = await queueSnapshot(db, String(row.queue_id));
  const t = q.tickets.find((t) => t.id === row.id);
  if (!t) throw new AppError("This ticket has expired.", 404);
  const { id: _id, ...ticket } = t;
  void _id;
  return {
    name: q.name,
    desk: q.desk,
    message:
      q.paused && q.preferences.pauseMessage
        ? q.preferences.pauseMessage
        : q.message,
    paused: q.paused,
    ticket,
    ahead: q.tickets.filter(
      (other) =>
        other.number < t.number &&
        (other.state === "waiting" || isActive(other.state)),
    ).length,
    current: q.tickets.find((t) => isActive(t.state))?.number ?? null,
    version: q.version,
    demo: q.demo,
  };
}
export async function publicSnapshot(
  db: Client,
  displayId: string,
): Promise<DisplayView> {
  const row = (
    await db.execute({
      sql: "SELECT id FROM queues WHERE display_id=?",
      args: [displayId],
    })
  ).rows[0];
  if (!row) throw new AppError("This display is unavailable.", 404);
  const q = await queueSnapshot(db, String(row.id));
  const current = q.tickets.find((t) => isActive(t.state));
  const waiting = q.tickets.filter((t) => t.state === "waiting");
  return {
    name: q.name,
    desk: q.desk,
    message: q.paused ? q.preferences.pauseMessage : "",
    paused: q.paused,
    current: current ? { number: current.number, state: current.state } : null,
    theme: q.preferences.theme,
    chime: q.preferences.chime,
    chimeStyle: q.preferences.chimeStyle,
    language: q.preferences.displayLanguage,
    selfService: q.preferences.selfService,
    announcedAt: q.calledAt,
    upcoming: waiting.slice(0, q.preferences.upcoming).map((t) => t.number),
    waiting: waiting.length,
    version: q.version,
    demo: q.demo,
  };
}

async function admissionQueue(db: Client, code: string) {
  return queueFrom(
    (
      await db.execute({
        sql: "SELECT * FROM queues WHERE display_id=?",
        args: [code],
      })
    ).rows[0],
  );
}

export async function admissionView(
  db: Client,
  code: string,
): Promise<AdmissionView> {
  const queue = await admissionQueue(db, code);
  const row = (
    await db.execute({
      sql: "SELECT value FROM queue_preferences WHERE queue_id=?",
      args: [queue.id],
    })
  ).rows[0];
  const preferences = row
    ? { ...defaultPreferences, ...JSON.parse(String(row.value)) }
    : defaultPreferences;
  return {
    name: queue.name,
    desk: queue.desk,
    version: queue.version,
    open: !queue.paused && preferences.selfService,
    footer: preferences.printFooter,
    message: queue.paused ? preferences.pauseMessage : "",
  };
}

export async function joinQueue(
  db: Client,
  code: string,
  key: unknown,
): Promise<PublicTicket> {
  const queue = await admissionQueue(db, code);
  const result = await serializeWrite(() =>
    mutateQueueTransaction(db, queue.id, { action: "issue", key }, true),
  );
  if (!result.ticket || !result.token) throw new Error("Missing issued ticket");
  return { number: result.ticket.number, token: result.token };
}
