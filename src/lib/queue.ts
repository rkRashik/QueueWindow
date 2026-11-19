import { createHash } from "node:crypto";
import { and, asc, eq, inArray, max, sql } from "drizzle-orm";
import type { Database, QueueTransaction } from "@/db";
import { counters, organizations, tickets } from "@/db/schema";
import { consumeAdmission } from "@/features/queue/admission-limit";
import { ticketNumber } from "@/features/queue/rules";
import {
  counterMissing,
  counterScope,
  ticketFields,
  ticketMissing,
  ticketScope,
} from "@/features/queue/store";
import { AppError } from "./app-error";

export { deskState } from "@/features/queue/read-model";

type Source = { source: "walkin" } | { source: "public"; clientHash: string };
type TicketStatus = typeof tickets.$inferSelect.status;

async function lockCounter(
  tx: QueueTransaction,
  orgId: string,
  counterId: string,
) {
  const [counter] = await tx
    .select()
    .from(counters)
    .where(counterScope(orgId, counterId))
    .for("update");
  if (!counter) throw counterMissing();
  return counter;
}

export async function issueTicket(
  db: Database,
  orgId: string,
  counterId: string,
  key: string,
  source: Source,
) {
  const idempotencyKey = createHash("sha256")
    .update(JSON.stringify([orgId, counterId, source.source, key]))
    .digest("hex");

  return db.transaction(async (tx) => {
    const counter = await lockCounter(tx, orgId, counterId);
    const scope = ticketScope(orgId, counterId);
    const [original] = await tx
      .select(ticketFields)
      .from(tickets)
      .where(and(scope, eq(tickets.idempotencyKey, idempotencyKey)));
    if (original) return original;

    const [subscription] = await tx
      .select({
        expiresAt: organizations.expiresAt,
        plan: organizations.plan,
        now: sql<number>`extract(epoch from statement_timestamp()) * 1000`.mapWith(
          Number,
        ),
      })
      .from(organizations)
      .where(eq(organizations.id, orgId));
    const now = new Date(subscription.now);
    if (subscription.expiresAt <= now)
      throw new AppError("This organization's subscription has expired.", 402);
    if (counter.status !== "OPEN")
      throw new AppError("This counter is paused.", 409);
    if (source.source === "public")
      await consumeAdmission(tx, orgId, source.clientHash);

    const [latest] = await tx
      .select({ sequence: max(tickets.sequence) })
      .from(tickets)
      .where(
        and(
          scope,
          eq(
            tickets.businessDate,
            sql`(${now.toISOString()}::timestamptz at time zone 'Asia/Dhaka')::date`,
          ),
        ),
      );
    const sequence = (latest.sequence ?? 0) + 1;
    if (subscription.plan === "DEMO" && sequence > 200)
      throw new AppError(
        "This demo counter has reached its daily ticket limit.",
        429,
      );
    const [ticket] = await tx
      .insert(tickets)
      .values({
        orgId,
        counterId,
        idempotencyKey,
        sequence,
        issuedAt: now,
        tokenNumber: ticketNumber(counter.prefix, sequence),
        status: "WAITING",
      })
      .returning(ticketFields);
    return ticket;
  });
}

export async function callNext(db: Database, orgId: string, counterId: string) {
  return db.transaction(async (tx) => {
    await lockCounter(tx, orgId, counterId);
    const scope = ticketScope(orgId, counterId);
    const [next] = await tx
      .select({ id: tickets.id })
      .from(tickets)
      .where(and(scope, eq(tickets.status, "WAITING")))
      .orderBy(asc(tickets.issuedAt), asc(tickets.sequence), asc(tickets.id))
      .limit(1);
    if (!next) return null;

    const now = sql`statement_timestamp()`;
    await tx
      .update(tickets)
      .set({ status: "SERVED", completedAt: now })
      .where(and(scope, eq(tickets.status, "CALLED")));
    const [called] = await tx
      .update(tickets)
      .set({ status: "CALLED", calledAt: now, firstCalledAt: now })
      .where(and(scope, eq(tickets.id, next.id)))
      .returning(ticketFields);
    return called;
  });
}

async function updateTicket(
  db: Database,
  orgId: string,
  counterId: string,
  ticketId: string,
  allowed: TicketStatus[],
  patch: Partial<{
    status: TicketStatus;
    calledAt: ReturnType<typeof sql>;
    completedAt: ReturnType<typeof sql>;
  }>,
) {
  return db.transaction(async (tx) => {
    await lockCounter(tx, orgId, counterId);
    const target = and(ticketScope(orgId, counterId), eq(tickets.id, ticketId));
    const [updated] = await tx
      .update(tickets)
      .set(patch)
      .where(and(target, inArray(tickets.status, allowed)))
      .returning(ticketFields);
    if (updated) return updated;
    const [exists] = await tx
      .select({ id: tickets.id })
      .from(tickets)
      .where(target);
    if (!exists) throw ticketMissing();
    throw new AppError(
      "That ticket has changed. Refresh the queue and try again.",
      409,
    );
  });
}

export function completeTicket(
  db: Database,
  orgId: string,
  counterId: string,
  ticketId: string,
) {
  return updateTicket(db, orgId, counterId, ticketId, ["CALLED"], {
    status: "SERVED",
    completedAt: sql`statement_timestamp()`,
  });
}

export function skipTicket(
  db: Database,
  orgId: string,
  counterId: string,
  ticketId: string,
) {
  return updateTicket(db, orgId, counterId, ticketId, ["CALLED", "WAITING"], {
    status: "SKIPPED",
    completedAt: sql`statement_timestamp()`,
  });
}

export function recallTicket(
  db: Database,
  orgId: string,
  counterId: string,
  ticketId: string,
) {
  return updateTicket(db, orgId, counterId, ticketId, ["CALLED"], {
    calledAt: sql`greatest(statement_timestamp(), ${tickets.calledAt} + interval '1 millisecond')`,
  });
}

export async function toggleCounterStatus(
  db: Database,
  orgId: string,
  counterId: string,
) {
  const [counter] = await db
    .update(counters)
    .set({
      status: sql`case when ${counters.status} = 'OPEN' then 'PAUSED' else 'OPEN' end`,
    })
    .where(counterScope(orgId, counterId))
    .returning();
  if (!counter) throw counterMissing();
  return counter;
}
