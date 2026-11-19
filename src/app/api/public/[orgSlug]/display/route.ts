import { getDb } from "@/db";
import { parse, route } from "@/features/queue/api";
import { slug } from "@/features/queue/input";
import { displaySnapshot } from "@/features/queue/public";
import { json } from "@/lib/http";

export const GET = route(
  async (
    _request: Request,
    { params }: { params: Promise<{ orgSlug: string }> },
  ) => {
    return json(
      await displaySnapshot(getDb(), parse(slug, (await params).orgSlug)),
    );
  },
);
