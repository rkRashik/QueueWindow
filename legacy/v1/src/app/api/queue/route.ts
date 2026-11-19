import { database } from "@/lib/db";
import { staffQueue, rateLimit } from "@/lib/auth";
import { queueSnapshot, mutateQueue } from "@/lib/queue";
import { assertSameOrigin, failure, json, readBody } from "@/lib/http";
export const runtime = "nodejs";
export async function GET() {
  try {
    return json(await queueSnapshot(await database(), await staffQueue()));
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const id = await staffQueue();
    await rateLimit(`write:${id}`, 80, 60000);
    return json(
      await mutateQueue(await database(), id, await readBody(request)),
    );
  } catch (e) {
    return failure(e);
  }
}
