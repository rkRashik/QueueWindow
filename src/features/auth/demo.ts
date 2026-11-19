import { and, eq, sql } from "drizzle-orm";
import { getDb, type QueueTransaction } from "@/db";
import { counters, organizations, tickets, users } from "@/db/schema";
import { ticketNumber } from "@/features/queue/rules";
import { today } from "@/features/queue/store";
import { AppError } from "@/lib/app-error";
import { signSession } from "@/lib/auth";
import { hashPassword } from "./service";

export const demoSlug = "demo-clinic";
export const demoPlan = "DEMO";

type Seat = { status: "SERVED" | "CALLED" | "WAITING"; issued: number; called?: number; done?: number };

// Minutes ago. Each desk tells a different story: busy, mid-service, and idle.
const script: { name: string; prefix: string; seats: Seat[] }[] = [
  {
    name: "Reception",
    prefix: "A",
    seats: [
      { status: "SERVED", issued: 52, called: 50, done: 46 },
      { status: "SERVED", issued: 47, called: 46, done: 41 },
      { status: "SERVED", issued: 39, called: 38, done: 35 },
      { status: "SERVED", issued: 33, called: 33, done: 28 },
      { status: "CALLED", issued: 14, called: 2 },
      { status: "WAITING", issued: 9 },
      { status: "WAITING", issued: 6 },
      { status: "WAITING", issued: 2 },
    ],
  },
  {
    name: "Dr. Rahman",
    prefix: "B",
    seats: [
      { status: "SERVED", issued: 48, called: 40, done: 32 },
      { status: "SERVED", issued: 35, called: 31, done: 24 },
      { status: "CALLED", issued: 22, called: 4 },
      { status: "WAITING", issued: 11 },
    ],
  },
  {
    name: "Pharmacy",
    prefix: "C",
    seats: [
      { status: "SERVED", issued: 41, called: 40, done: 37 },
      { status: "SERVED", issued: 26, called: 25, done: 21 },
    ],
  },
];

async function seed(tx: QueueTransaction, orgId: string) {
  const stations = await tx
    .insert(counters)
    .values(script.map(({ name, prefix }) => ({ orgId, name, prefix })))
    .returning();
  const now = Date.now();
  // Never backdate across Dhaka midnight (UTC+6, no DST): tickets must belong to today.
  const sinceMidnight = ((now / 60_000 + 360) % 1_440) - 1;
  const scale = Math.max(0, Math.min(1, sinceMidnight / 55));
  const at = (minutes?: number) =>
    minutes === undefined ? null : new Date(now - minutes * scale * 60_000);
  await tx.insert(tickets).values(
    script.flatMap(({ prefix, seats }) => {
      const counter = stations.find((station) => station.prefix === prefix)!;
      return seats.map((seat, index) => ({
        orgId,
        counterId: counter.id,
        tokenNumber: ticketNumber(prefix, index + 1),
        sequence: index + 1,
        status: seat.status,
        issuedAt: at(seat.issued)!,
        calledAt: at(seat.called),
        firstCalledAt: at(seat.called),
        completedAt: at(seat.done),
        idempotencyKey: crypto.randomUUID(),
      }));
    }),
  );
}

/** The shared demo resets itself once it holds yesterday's tickets or abandoned open ones. */
async function isStale(tx: QueueTransaction, orgId: string) {
  const [state] = await tx
    .select({
      stale: sql<boolean>`coalesce(bool_or(${tickets.businessDate} < ${today} or (${tickets.status} in ('WAITING', 'CALLED') and coalesce(${tickets.calledAt}, ${tickets.issuedAt}) < statement_timestamp() - interval '30 minutes')), false)`,
    })
    .from(tickets)
    .where(eq(tickets.orgId, orgId));
  return state.stale;
}

async function lockDemo(tx: QueueTransaction) {
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtext('queuewindow-demo-clinic'))`,
  );
  const [organization] = await tx
    .select()
    .from(organizations)
    .where(eq(organizations.slug, demoSlug));
  return organization;
}

async function heal(tx: QueueTransaction, orgId: string) {
  if (!(await isStale(tx, orgId))) return;
  // Counters cascade to their tickets; scoped to the demo org only.
  await tx.delete(counters).where(eq(counters.orgId, orgId));
  await seed(tx, orgId);
}

/** Called by public demo pages: cheap read first, lock only when a reset is due. */
export async function freshDemo(slug: string) {
  if (slug !== demoSlug) return;
  const db = getDb();
  const [organization] = await db
    .select({ id: organizations.id, plan: organizations.plan })
    .from(organizations)
    .where(eq(organizations.slug, demoSlug));
  if (organization?.plan !== demoPlan) return;
  if (!(await db.transaction((tx) => isStale(tx, organization.id)))) return;
  await db.transaction(async (tx) => {
    const locked = await lockDemo(tx);
    if (locked?.plan === demoPlan) await heal(tx, locked.id);
  });
}

export async function demoSession() {
  return getDb().transaction(async (tx) => {
    let organization = await lockDemo(tx);

    if (!organization) {
      [organization] = await tx
        .insert(organizations)
        .values({
          name: "QueueWindow Demo Clinic",
          slug: demoSlug,
          plan: demoPlan,
          expiresAt: new Date("2099-01-01T00:00:00.000Z"),
        })
        .returning();

      await tx.insert(users).values({
        orgId: organization.id,
        fullName: "Demo Owner",
        username: `demo-${crypto.randomUUID().slice(0, 18)}`,
        email: `${organization.id}@demo.example.invalid`,
        passwordHash: await hashPassword(crypto.randomUUID()),
        role: "OWNER",
      });
      await seed(tx, organization.id);
    }

    if (organization.plan !== demoPlan)
      throw new AppError("The live demo is unavailable.", 409);
    await heal(tx, organization.id);
    const [owner] = await tx
      .select({ id: users.id, username: users.username })
      .from(users)
      .where(
        and(
          eq(users.orgId, organization.id),
          eq(users.role, "OWNER"),
          eq(users.email, `${organization.id}@demo.example.invalid`),
        ),
      );
    if (!owner) throw new AppError("The live demo is unavailable.", 409);

    return signSession({
      userId: owner.id,
      orgId: organization.id,
      orgSlug: demoSlug,
      username: owner.username,
      role: "OWNER",
    });
  });
}
