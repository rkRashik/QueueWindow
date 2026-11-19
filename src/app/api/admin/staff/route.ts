import type { NextRequest } from "next/server";
import { getDb } from "@/db";
import { createStaff, listStaff } from "@/features/queue/admin";
import { parseBody, requireIdentity, route } from "@/features/queue/api";
import { staffInput } from "@/features/queue/input";
import { json } from "@/lib/http";

export const GET = route(async (request: NextRequest) => {
  const { orgId } = await requireIdentity(request, true);
  return json({ staff: await listStaff(getDb(), orgId) });
});

export const POST = route(async (request: NextRequest) => {
  const { orgId } = await requireIdentity(request, true);
  const input = await parseBody(request, staffInput);
  return json({ staff: await createStaff(getDb(), orgId, input) }, 201);
});
