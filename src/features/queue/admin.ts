import { and, asc, eq, inArray } from "drizzle-orm";
import type { z } from "zod";
import type { Database } from "@/db";
import { isUniqueViolation } from "@/db/errors";
import { counters, organizations, tickets, users } from "@/db/schema";
import { hashPassword } from "@/features/auth/service";
import { AppError } from "@/lib/app-error";
import type {
  counterInput,
  counterPatch,
  organizationPatch,
  staffInput,
} from "./input";
import { counterMissing, counterScope, ticketScope } from "./store";

const staffFields = {
  id: users.id,
  fullName: users.fullName,
  username: users.username,
  role: users.role,
  createdAt: users.createdAt,
};

export function listCounters(db: Database, orgId: string) {
  return db
    .select()
    .from(counters)
    .where(eq(counters.orgId, orgId))
    .orderBy(asc(counters.createdAt), asc(counters.id));
}

function counterError(error: unknown): never {
  if (isUniqueViolation(error, "counters_org_prefix_key")) {
    throw new AppError(
      "This organization already uses that counter prefix.",
      409,
    );
  }
  throw error;
}

export async function createCounter(
  db: Database,
  orgId: string,
  input: z.infer<typeof counterInput>,
) {
  try {
    const [counter] = await db
      .insert(counters)
      .values({ ...input, orgId })
      .returning();
    return counter;
  } catch (error) {
    counterError(error);
  }
}

export async function updateCounter(
  db: Database,
  orgId: string,
  counterId: string,
  input: z.infer<typeof counterPatch>,
) {
  try {
    const [counter] = await db
      .update(counters)
      .set(input)
      .where(counterScope(orgId, counterId))
      .returning();
    if (!counter) throw counterMissing();
    return counter;
  } catch (error) {
    counterError(error);
  }
}

export function deleteCounter(db: Database, orgId: string, counterId: string) {
  return db.transaction(async (tx) => {
    const scope = counterScope(orgId, counterId);
    const [counter] = await tx
      .select({ id: counters.id })
      .from(counters)
      .where(scope)
      .for("update");
    if (!counter) throw counterMissing();

    const [active] = await tx
      .select({ id: tickets.id })
      .from(tickets)
      .where(
        and(
          ticketScope(orgId, counterId),
          inArray(tickets.status, ["WAITING", "CALLED"]),
        ),
      )
      .limit(1);
    if (active)
      throw new AppError(
        "Resolve waiting and called tickets before deleting the counter.",
        409,
      );
    await tx.delete(counters).where(scope);
  });
}

export function listStaff(db: Database, orgId: string) {
  return db
    .select(staffFields)
    .from(users)
    .where(and(eq(users.orgId, orgId), eq(users.role, "STAFF")))
    .orderBy(asc(users.fullName), asc(users.id));
}

export async function createStaff(
  db: Database,
  orgId: string,
  input: z.infer<typeof staffInput>,
) {
  const { password, ...details } = input;
  const passwordHash = await hashPassword(password);

  try {
    const [staff] = await db
      .insert(users)
      .values({ ...details, passwordHash, orgId, role: "STAFF" })
      .returning(staffFields);
    return staff;
  } catch (error) {
    if (isUniqueViolation(error, "users_username_unique")) {
      throw new AppError("An account already uses that username.", 409);
    }
    throw error;
  }
}

export async function deleteStaff(
  db: Database,
  orgId: string,
  actorId: string,
  staffId: string,
) {
  if (staffId === actorId)
    throw new AppError("You cannot delete your own account.", 409);
  const [deleted] = await db
    .delete(users)
    .where(
      and(
        eq(users.orgId, orgId),
        eq(users.id, staffId),
        eq(users.role, "STAFF"),
      ),
    )
    .returning({ id: users.id });
  if (!deleted) throw new AppError("Staff member not found.", 404);
}

export async function updateOrganization(
  db: Database,
  orgId: string,
  input: z.infer<typeof organizationPatch>,
) {
  const [organization] = await db
    .update(organizations)
    .set(input)
    .where(eq(organizations.id, orgId))
    .returning();
  if (!organization) throw new AppError("Organization not found.", 404);
  return organization;
}
