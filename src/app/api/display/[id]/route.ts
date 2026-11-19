import { database } from "@/lib/db";
import { publicSnapshot } from "@/lib/queue";
import { failure, json } from "@/lib/http";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    return json(
      await publicSnapshot(await database(), (await context.params).id),
    );
  } catch (e) {
    return failure(e);
  }
}
