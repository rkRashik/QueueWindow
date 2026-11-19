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
  const claims = await verifySession(cookie?.value);
  return claims ? findIdentity(claims.userId, claims.orgId) : null;
}
