import { and, asc, count, eq, sql } from "drizzle-orm";
import type { Database } from "@/db";
import { counters, organizations, tickets } from "@/db/schema";
import { AppError } from "@/lib/app-error";
import { typicalService } from "./read-model";
import { estimatedWait } from "./rules";
import { ticketMissing, ticketScope } from "./store";

export async function organizationBySlug(db: Database, slug: string) {
  const [organization] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, slug));
  if (!organization) throw new AppError("Organization not found.", 404);
  return organization;
}

export async function displaySnapshot(db: Database, slug: string) {
  const scope = and(
    eq(tickets.orgId, counters.orgId),
    eq(tickets.counterId, counters.id),
  );
  const active = db
    .select({
      tokenNumber: tickets.tokenNumber,
      calledAt: tickets.calledAt,
      elapsed: sql<number>`extract(epoch from (statement_timestamp() - ${tickets.firstCalledAt}))::float8`.as(
        "elapsed",
      ),
    })
    .from(tickets)
    .where(and(scope, eq(tickets.status, "CALLED")))
    .limit(1)
    .as("active");

  const next = db
    .select({ tokenNumber: tickets.tokenNumber })
    .from(tickets)
    .where(and(scope, eq(tickets.status, "WAITING")))
    .orderBy(asc(tickets.issuedAt), asc(tickets.sequence), asc(tickets.id))
    .limit(3);
  const rows = await db
    .select({
      organization: {
        name: organizations.name,
        logoUrl: organizations.logoUrl,
        primaryColor: organizations.primaryColor,
      },
      counter: {
        id: counters.id,
        name: counters.name,
        prefix: counters.prefix,
        status: counters.status,
      },
      called: { tokenNumber: active.tokenNumber, calledAt: active.calledAt },
      waitingTokens: sql<string[]>`array(${next})`,
      waitingCount:
        sql<number>`(select count(*) from ${tickets} where ${scope} and ${tickets.status} = 'WAITING')`.mapWith(
          Number,
        ),
      typicalServiceSeconds: typicalService(scope),
      activeElapsed: active.elapsed,
    })
    .from(organizations)
    .leftJoin(counters, eq(counters.orgId, organizations.id))
    .leftJoinLateral(active, sql`true`)
    .where(eq(organizations.slug, slug))
    .orderBy(asc(counters.createdAt), asc(counters.id));

  if (!rows[0]) throw new AppError("Organization not found.", 404);
  return {
    organization: rows[0].organization,
    counters: rows.flatMap((row) =>
      row.counter
        ? [
            {
              ...row.counter,
              calledTicket: row.called,
              waitingTokens: row.waitingTokens ?? [],
              waitingCount: row.waitingCount,
              // What a visitor joining now should expect; computed once, here.
              estimatedWaitMinutes: estimatedWait(
                row.waitingCount,
                row.typicalServiceSeconds,
                row.called?.tokenNumber ? (row.activeElapsed ?? 0) : null,
              ),
            },
          ]
        : [],
    ),
  };
}

export function visitorTicket(db: Database, orgId: string, ticketId: string) {
  return db.transaction(
    async (tx) => {
      const [ticket] = await tx
        .select({
          counterId: tickets.counterId,
          counterName: counters.name,
          tokenNumber: tickets.tokenNumber,
          status: tickets.status,
          issuedAt: sql<string>`${tickets.issuedAt}::text`,
          sequence: tickets.sequence,
          id: tickets.id,
        })
        .from(tickets)
        .innerJoin(
          counters,
          and(eq(counters.orgId, orgId), eq(counters.id, tickets.counterId)),
        )
        .where(and(eq(tickets.orgId, orgId), eq(tickets.id, ticketId)));
      if (!ticket) throw ticketMissing();

      const publicTicket = {
        status: ticket.status,
        tokenNumber: ticket.tokenNumber,
        counterName: ticket.counterName,
      };
      if (ticket.status !== "WAITING")
        return { ...publicTicket, peopleAhead: 0, estimatedWaitMinutes: 0 };

      const scope = ticketScope(orgId, ticket.counterId);
      const [waiting] = await tx
        .select({ count: count() })
        .from(tickets)
        .where(
          and(
            scope,
            eq(tickets.status, "WAITING"),
            sql`(${tickets.issuedAt}, ${tickets.sequence}, ${tickets.id}) < (${ticket.issuedAt}::timestamptz, ${ticket.sequence}, ${ticket.id}::uuid)`,
          ),
        );
      const [called] = await tx
        .select({
          elapsed: sql<
            number | null
          >`extract(epoch from (statement_timestamp() - ${tickets.firstCalledAt}))::float8`,
        })
        .from(tickets)
        .where(and(scope, eq(tickets.status, "CALLED")));
      const [service] = await tx
        .select({ typical: typicalService(scope) })
        .from(sql`(select 1) as one`);
      return {
        ...publicTicket,
        peopleAhead: waiting.count + (called ? 1 : 0),
        estimatedWaitMinutes: estimatedWait(
          waiting.count,
          service.typical,
          called?.elapsed ?? null,
        ),
      };
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}
