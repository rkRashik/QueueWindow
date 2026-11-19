import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { sessionCookie, sessionMaxAge, verifySession } from "@/lib/auth";
import { findIdentity } from "./service";

export function setSessionCookie(response: NextResponse, token: string | null) {
  response.cookies.set(sessionCookie, token ?? "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: token ? sessionMaxAge : 0,
  });
  return response;
}

export async function getCurrentIdentity() {
  const cookie = (await cookies()).get(sessionCookie);
  return identityForSession(cookie?.value);
}

export async function identityForSession(token: string | undefined) {
  const claims = await verifySession(token);
  return claims ? findIdentity(claims.userId, claims.orgId) : null;
}
