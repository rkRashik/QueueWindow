import { SignJWT } from "jose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signSession, verifySession } from "../src/lib/auth";
import { loginInput, signupInput } from "../src/features/auth/validation";

const secret = "test-secret-with-at-least-thirty-two-bytes";
const claims = {
  userId: "11111111-1111-4111-8111-111111111111",
  orgId: "22222222-2222-4222-8222-222222222222",
  orgSlug: "dhaka-clinic",
  username: "owner",
  role: "OWNER" as const,
};

beforeEach(() => vi.stubEnv("JWT_SECRET", secret));
afterEach(() => vi.unstubAllEnvs());

describe("session tokens", () => {
  it("round-trips the signed organization membership", async () => {
    await expect(verifySession(await signSession(claims))).resolves.toEqual(
      claims,
    );
  });

  it("rejects a token signed with another key", async () => {
    const token = await signSession(claims);
    vi.stubEnv("JWT_SECRET", "a-different-key-with-thirty-two-bytes");
    await expect(verifySession(token)).resolves.toBeNull();
  });

  it("rejects expired tokens and tokens with an unexpected role", async () => {
    const makeToken = (role: string, expiresIn: string | number) =>
      new SignJWT({ ...claims, role })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuer("queuewindow")
        .setAudience("queuewindow-session")
        .setIssuedAt()
        .setExpirationTime(expiresIn)
        .sign(new TextEncoder().encode(secret));

    await expect(
      verifySession(await makeToken("OWNER", 1)),
    ).resolves.toBeNull();
    await expect(
      verifySession(await makeToken("ADMIN", "1h")),
    ).resolves.toBeNull();
  });

  it("requires a signing key of at least 32 bytes", async () => {
    vi.stubEnv("JWT_SECRET", "short");
    await expect(signSession(claims)).rejects.toThrow("JWT_SECRET");
  });
});

const signup = {
  orgName: "Dhaka Clinic",
  fullName: "Desk Owner",
  username: " Desk.Owner ",
  email: " Owner@example.com ",
  password: "passphrase that retains trailing whitespace ",
};

describe("credentials", () => {
  it("canonicalizes emails and usernames while preserving passwords", () => {
    expect(signupInput.parse(signup)).toMatchObject({
      username: "desk.owner",
      email: "owner@example.com",
      password: signup.password,
    });
    expect(
      loginInput.parse({
        identifier: " Desk.Owner ",
        password: signup.password,
      }).identifier,
    ).toBe("desk.owner");
    expect(
      loginInput.parse({
        identifier: " Owner@example.com ",
        password: signup.password,
      }).identifier,
    ).toBe("owner@example.com");
  });

  it("requires an owner email and reserves email-shaped identifiers for email", () => {
    expect(signupInput.safeParse({ ...signup, email: "" }).success).toBe(false);
    expect(
      signupInput.safeParse({ ...signup, username: signup.email }).success,
    ).toBe(false);
  });

  it("rejects passwords that bcrypt would truncate, including multibyte passwords", () => {
    const password = "ক".repeat(25);
    expect(signupInput.safeParse({ ...signup, password }).success).toBe(false);
    expect(
      loginInput.safeParse({ identifier: "owner", password }).success,
    ).toBe(false);
  });
});
