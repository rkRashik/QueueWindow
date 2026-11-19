import { getDb } from "@/db";
import { parse, route } from "@/features/queue/api";
import { eventStream, streamDurationMs } from "@/features/queue/event-stream";
import { slug } from "@/features/queue/input";
import { displaySnapshot } from "@/features/queue/public";

export const maxDuration = 30;

export const GET = route(
  async (
    request: Request,
    { params }: { params: Promise<{ orgSlug: string }> },
  ) => {
    const deadline = Date.now() + streamDurationMs;
    const orgSlug = parse(slug, (await params).orgSlug);
    const db = getDb();
    const load = () => displaySnapshot(db, orgSlug);
    const initial = await load();
    return new Response(eventStream(initial, load, request.signal, deadline), {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-store, no-transform",
        "X-Accel-Buffering": "no",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  },
);
