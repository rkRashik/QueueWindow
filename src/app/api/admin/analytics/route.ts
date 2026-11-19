import type { NextRequest } from "next/server";
import { getDb } from "@/db";
import { requireIdentity, route } from "@/features/queue/api";
import { analytics } from "@/features/queue/read-model";
import { json } from "@/lib/http";

export const GET = route(async (request: NextRequest) => {
  const { orgId } = await requireIdentity(request, true);
  return json(await analytics(getDb(), orgId));
});
