import { setSessionCookie } from "@/features/auth/session";
import { assertSameOrigin, failure } from "@/lib/http";
import { NextResponse } from "next/server";

export function POST(request: Request) {
  try {
    assertSameOrigin(request);
    if (
      request.headers
        .get("content-type")
        ?.startsWith("application/x-www-form-urlencoded")
    ) {
      return setSessionCookie(
        new NextResponse(null, {
          status: 303,
          headers: { Location: "/login", "Cache-Control": "no-store" },
        }),
        null,
      );
    }
    return setSessionCookie(
      new NextResponse(null, {
        status: 204,
        headers: { "Cache-Control": "no-store" },
      }),
      null,
    );
  } catch (error) {
    return failure(error);
  }
}
