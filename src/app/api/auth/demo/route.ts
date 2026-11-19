import { NextResponse } from "next/server";
import { demoSession } from "@/features/auth/demo";
import { setSessionCookie } from "@/features/auth/session";
import { assertSameOrigin, failure, json } from "@/lib/http";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await demoSession();
    const response = request.headers.get("accept")?.includes("application/json")
      ? json({ redirectTo: "/desk" })
      : new NextResponse(null, {
          status: 303,
          headers: { Location: "/desk", "Cache-Control": "no-store" },
        });
    return setSessionCookie(response, session);
  } catch (error) {
    return failure(error);
  }
}
