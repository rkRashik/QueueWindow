import type { NextRequest } from "next/server";
import { getDb } from "@/db";
import { createCounter, listCounters } from "@/features/queue/admin";
import { parseBody, requireIdentity, route } from "@/features/queue/api";
import { counterInput } from "@/features/queue/input";
import { json } from "@/lib/http";

export const GET = route(async (request: NextRequest) => {
  const { orgId } = await requireIdentity(request, true);
  return json({ counters: await listCounters(getDb(), orgId) });
});

export const POST = route(async (request: NextRequest) => {
  const { orgId } = await requireIdentity(request, true);
  const input = await parseBody(request, counterInput);
  return json({ counter: await createCounter(getDb(), orgId, input) }, 201);
});
