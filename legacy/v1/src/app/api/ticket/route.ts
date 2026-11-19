import { database } from "@/lib/db";
import { staffQueue, rateLimit, clientKey } from "@/lib/auth";
import { queueSnapshot, visitorSnapshot } from "@/lib/queue";
import { ticketToken } from "@/lib/crypto";
import { assertSameOrigin, failure, json, readBody } from "@/lib/http";
import { AppError } from "@/lib/domain";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    await rateLimit(`visitor:${clientKey(request)}`, 600, 60000);
    const token =
      request.headers.get("authorization")?.replace(/^Bearer /, "") || "";
    return json(await visitorSnapshot(await database(), token));
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const q = await queueSnapshot(await database(), await staffQueue());
    const body = await readBody(request);
    const t = q.tickets.find((t) => t.id === body.ticketId);
    if (!t) throw new AppError("That ticket is unavailable.", 404);
    return json({ token: ticketToken(t.id), ticket: t });
  } catch (e) {
    return failure(e);
  }
}
