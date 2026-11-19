import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { isUniqueViolation } from "@/db/errors";
import { counters, organizations, users } from "@/db/schema";
import { signSession } from "@/lib/auth";
import { HttpError } from "@/lib/http";
import type { z } from "zod";
import type { loginInput, signupInput } from "./validation";

const trialLengthMs = 14 * 24 * 60 * 60 * 1000;
const passwordCost = 12;
const dummyHash =
  "$2b$12$mcL5s4BA0i0msxQtHsC65.AGPf0S9jZcMPl/9y4qXGNiis5oH9IOO";

function organizationSlug(name: string) {
  const base = name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 48)
    .replace(/^-+|-+$/g, "");
  return `${base || "workspace"}-${crypto.randomUUID()}`;
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, passwordCost);
}

export async function signup(input: z.infer<typeof signupInput>) {
  const passwordHash = await hashPassword(input.password);

  try {
    return await getDb().transaction(async (tx) => {
      const [organization] = await tx
        .insert(organizations)
        .values({
          name: input.orgName,
          slug: organizationSlug(input.orgName),
          expiresAt: new Date(Date.now() + trialLengthMs),
        })
        .returning({ id: organizations.id, slug: organizations.slug });

      const [user] = await tx
        .insert(users)
        .values({
          orgId: organization.id,
          fullName: input.fullName,
          username: input.username,
          email: input.email,
          passwordHash,
          role: "OWNER",
        })
        .returning({
          id: users.id,
          username: users.username,
          role: users.role,
        });

      await tx.insert(counters).values({
        orgId: organization.id,
        name: "Counter 1",
        prefix: "A",
      });

      return signSession({
        userId: user.id,
        orgId: organization.id,
        orgSlug: organization.slug,
        username: user.username,
        role: user.role,
      });
    });
  } catch (error) {
    if (
      isUniqueViolation(error, "users_username_unique", "users_email_unique")
    ) {
      throw new HttpError(
        "An account already uses that email or username.",
        409,
      );
    }
    throw error;
  }
}

export async function login(input: z.infer<typeof loginInput>) {
  const column = input.identifier.includes("@") ? users.email : users.username;
  const [account] = await getDb()
    .select({
      userId: users.id,
      orgId: users.orgId,
      role: users.role,
      orgSlug: organizations.slug,
      username: users.username,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .innerJoin(organizations, eq(users.orgId, organizations.id))
    .where(eq(column, input.identifier))
    .limit(1);

  const valid = await bcrypt.compare(
    input.password,
    account?.passwordHash ?? dummyHash,
  );
  if (!valid || !account) {
    throw new HttpError("The email, username, or password is incorrect.", 401);
  }

  return signSession({
    userId: account.userId,
    orgId: account.orgId,
    role: account.role,
    orgSlug: account.orgSlug,
    username: account.username,
  });
}

export async function findIdentity(userId: string, orgId: string) {
  const [identity] = await getDb()
    .select({
      user: {
        id: users.id,
        orgId: users.orgId,
        fullName: users.fullName,
        email: users.email,
        username: users.username,
        role: users.role,
        createdAt: users.createdAt,
      },
      organization: organizations,
    })
    .from(users)
    .innerJoin(organizations, eq(users.orgId, organizations.id))
    .where(and(eq(users.id, userId), eq(users.orgId, orgId)))
    .limit(1);

  return identity ?? null;
}
