import { clientKey, rateLimit } from "@/lib/auth";
import { database } from "@/lib/db";
import { AppError } from "@/lib/domain";
import { assertSameOrigin, failure, json, readBody } from "@/lib/http";
import { admissionView, joinQueue } from "@/lib/queue";

export const runtime = "nodejs";
type Route = { params: Promise<{ code: string }> };

async function queueCode(route: Route) {
  const { code } = await route.params;
  if (!/^[0-9a-f-]{36}$/.test(code))
    throw new AppError("Queue unavailable.", 404);
  return code;
}

export async function GET(_: Request, route: Route) {
  try {
    const code = await queueCode(route);
    return json(await admissionView(await database(), code));
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request, route: Route) {
  try {
    assertSameOrigin(request);
    const code = await queueCode(route);
    const body = await readBody(request);
    const db = await database();
    await admissionView(db, code);
    await rateLimit(`join:${code}:${clientKey(request)}`, 18, 60000);
    await rateLimit(`join-queue:${code}`, 48, 60000);
    return json(await joinQueue(db, code, body?.key));
  } catch (error) {
    return failure(error);
  }
}
