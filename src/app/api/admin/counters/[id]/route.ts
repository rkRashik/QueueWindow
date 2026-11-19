import type { NextRequest } from "next/server";
import { getDb } from "@/db";
import { deleteCounter, updateCounter } from "@/features/queue/admin";
import { parse, parseBody, requireIdentity, route } from "@/features/queue/api";
import { counterPatch, id } from "@/features/queue/input";
import { json } from "@/lib/http";

type Context = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: NextRequest, context: Context) => {
  const { orgId } = await requireIdentity(request, true);
  const counterId = parse(id, (await context.params).id);
  const input = await parseBody(request, counterPatch);
  return json({
    counter: await updateCounter(getDb(), orgId, counterId, input),
  });
});

export const DELETE = route(async (request: NextRequest, context: Context) => {
  const { orgId } = await requireIdentity(request, true);
  await deleteCounter(getDb(), orgId, parse(id, (await context.params).id));
  return json({ ok: true });
});
