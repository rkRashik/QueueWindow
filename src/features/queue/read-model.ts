import { and, asc, count, eq, sql, type SQL } from "drizzle-orm";
import type { Database } from "@/db";
import { counters, tickets } from "@/db/schema";
import { serviceSampleSeconds } from "./rules";
import { counterMissing, ticketFields, ticketScope, today } from "./store";

const waitSeconds = sql`extract(epoch from (${tickets.firstCalledAt} - ${tickets.issuedAt}))`;
export const serviceSeconds = sql`extract(epoch from (${tickets.completedAt} - ${tickets.firstCalledAt}))`;

/**
 * Median service time of the counter's last 20 plausible services today.
 * A median over a recent window resists the long "served" spans that appear when a
 * desk leaves a ticket open and only closes it by calling the next one.
 */
export function typicalService(scope: SQL | undefined) {
  return sql<number | null>`(select percentile_cont(0.5) within group (order by recent.seconds)::float8 from (select ${serviceSeconds} as seconds from ${tickets} where ${scope} and ${tickets.businessDate} = ${today} and ${tickets.status} = 'SERVED' and ${serviceSeconds} between ${serviceSampleSeconds.min} and ${serviceSampleSeconds.max} order by ${tickets.completedAt} desc limit 20) recent)`;
}

const aggregateFields = {
  issued: count(tickets.id),
  served:
    sql<number>`count(*) filter (where ${tickets.status} = 'SERVED')`.mapWith(
      Number,
    ),
  waiting:
    sql<number>`count(*) filter (where ${tickets.status} = 'WAITING')`.mapWith(
      Number,
    ),
  skipped:
    sql<number>`count(*) filter (where ${tickets.status} = 'SKIPPED')`.mapWith(
      Number,
    ),
  waited: count(tickets.firstCalledAt),
  waitSeconds: sql<number>`coalesce(sum(${waitSeconds}), 0)`.mapWith(Number),
  serviced:
    sql<number>`count(${tickets.firstCalledAt}) filter (where ${tickets.status} = 'SERVED' and ${tickets.completedAt} is not null)`.mapWith(
      Number,
    ),
  serviceSeconds:
    sql<number>`coalesce(sum(${serviceSeconds}) filter (where ${tickets.status} = 'SERVED'), 0)`.mapWith(
      Number,
    ),
};

type Aggregate = { [K in keyof typeof aggregateFields]: number };

function averageMinutes(seconds: number, samples: number) {
  return samples ? Math.round(seconds / samples / 0.6) / 100 : null;
}

function stats(aggregate: Aggregate) {
  return {
    issued: aggregate.issued,
    served: aggregate.served,
    waiting: aggregate.waiting,
    skipped: aggregate.skipped,
    avgWaitMinutes: averageMinutes(aggregate.waitSeconds, aggregate.waited),
    avgServiceMinutes: averageMinutes(
      aggregate.serviceSeconds,
      aggregate.serviced,
    ),
  };
}

export async function analytics(db: Database, orgId: string) {
  const rows = await db
    .select({
      counterId: counters.id,
      name: counters.name,
      prefix: counters.prefix,
      ...aggregateFields,
    })
    .from(counters)
    .leftJoin(
      tickets,
      and(
        eq(tickets.orgId, orgId),
        eq(tickets.counterId, counters.id),
        eq(tickets.businessDate, today),
      ),
    )
    .where(eq(counters.orgId, orgId))
    .groupBy(counters.id)
    .orderBy(asc(counters.name), asc(counters.id));

  const total = {
    issued: 0,
    served: 0,
    waiting: 0,
    skipped: 0,
    waited: 0,
    waitSeconds: 0,
    serviced: 0,
    serviceSeconds: 0,
  };
  for (const row of rows) {
    for (const key of Object.keys(total) as (keyof Aggregate)[])
      total[key] += row[key];
  }
  return {
    totals: stats(total),
    counters: rows.map((row) => ({
      counterId: row.counterId,
      name: row.name,
      prefix: row.prefix,
      ...stats(row),
    })),
  };
}

export function deskState(db: Database, orgId: string, selectedId?: string) {
  return db.transaction(
    async (tx) => {
      const available = await tx
        .select({
          id: counters.id,
          name: counters.name,
          prefix: counters.prefix,
          status: counters.status,
        })
        .from(counters)
        .where(eq(counters.orgId, orgId))
        .orderBy(asc(counters.createdAt), asc(counters.id));

      const selected = selectedId
        ? available.find((counter) => counter.id === selectedId)
        : available[0];
      if (!selected) {
        if (selectedId) throw counterMissing();
        return {
          counters: available,
          selectedCounterId: null,
          calledTicket: null,
          waitingTickets: [],
          stats: null,
          typicalServiceSeconds: null,
        };
      }
      const scope = ticketScope(orgId, selected.id);
      const queue = await tx
        .select(ticketFields)
        .from(tickets)
        .where(and(scope, sql`${tickets.status} in ('WAITING', 'CALLED')`))
        .orderBy(asc(tickets.issuedAt), asc(tickets.sequence), asc(tickets.id));

      const [day] = await tx
        .select(aggregateFields)
        .from(tickets)
        .where(and(scope, eq(tickets.businessDate, today)));
      const [typical] = await tx
        .select({ seconds: typicalService(scope) })
        .from(sql`(select 1) as one`);
      return {
        counters: available,
        selectedCounterId: selected.id,
        calledTicket:
          queue.find((ticket) => ticket.status === "CALLED") ?? null,
        waitingTickets: queue.filter((ticket) => ticket.status === "WAITING"),
        stats: stats(day),
        typicalServiceSeconds: typical.seconds,
      };
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}
