import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { counters, organizations, tickets, users } from "@/db/schema";
import { ticketNumber } from "@/features/queue/rules";
import { AppError } from "@/lib/app-error";
import { signSession } from "@/lib/auth";
import { hashPassword } from "./service";

export const demoSlug = "demo-clinic";
export const demoPlan = "DEMO";

export async function demoSession() {
  return getDb().transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext('queuewindow-demo-clinic'))`,
    );
    let [organization] = await tx
      .select()
      .from(organizations)
      .where(eq(organizations.slug, demoSlug));

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

      const stations = await tx
        .insert(counters)
        .values([
          {
            orgId: organization.id,
            name: "Counter 1 — Reception",
            prefix: "A",
          },
          {
            orgId: organization.id,
            name: "Counter 2 — Dr. Rahman",
            prefix: "B",
          },
        ])
        .returning();

      const calledAt = new Date();
      await tx.insert(tickets).values(
        stations.flatMap((counter) =>
          Array.from(
            { length: counter.prefix === "A" ? 3 : 2 },
            (_, index) => ({
              orgId: organization.id,
              counterId: counter.id,
              tokenNumber: ticketNumber(counter.prefix, index + 1),
              sequence: index + 1,
              status: index === 0 ? ("CALLED" as const) : ("WAITING" as const),
              issuedAt: calledAt,
              calledAt: index === 0 ? calledAt : null,
              firstCalledAt: index === 0 ? calledAt : null,
              idempotencyKey: crypto.randomUUID(),
            }),
          ),
        ),
      );
    }

    if (organization.plan !== demoPlan)
      throw new AppError("The live demo is unavailable.", 409);
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
