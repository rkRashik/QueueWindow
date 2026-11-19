import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";
import { JOSEError } from "jose/errors";
import { z } from "zod";

export const sessionCookie = "qw_session";
export const sessionMaxAge = 60 * 60 * 24;

const issuer = "queuewindow";
const audience = "queuewindow-session";
const claimsSchema = z.object({
  userId: z.uuid(),
  orgId: z.uuid(),
  role: z.enum(["OWNER", "STAFF"]),
  orgSlug: z.string().min(1),
  username: z.string().min(1),
});

export type SessionClaims = z.infer<typeof claimsSchema>;

function signingKey() {
  const key = new TextEncoder().encode(process.env.JWT_SECRET ?? "");
  if (key.byteLength < 32)
    throw new Error("JWT_SECRET must be at least 32 bytes.");
  return key;
}

export async function signSession(claims: SessionClaims) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(`${sessionMaxAge}s`)
    .sign(signingKey());
}

export async function verifySession(
  token: string | undefined,
): Promise<SessionClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, signingKey(), {
      algorithms: ["HS256"],
      issuer,
      audience,
      requiredClaims: ["exp", "iat"],
      maxTokenAge: sessionMaxAge,
    });
    const claims = claimsSchema.safeParse(payload);
    return claims.success ? claims.data : null;
  } catch (error) {
    if (error instanceof JOSEError) return null;
    throw error;
  }
}
