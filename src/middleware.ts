import { NextResponse, type NextRequest } from "next/server";
import { sessionCookie, verifySession } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const claims = await verifySession(request.cookies.get(sessionCookie)?.value);
  if (!claims) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/desk/:path*", "/admin/:path*"] };
