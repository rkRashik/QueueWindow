import type { NextRequest } from "next/server";
import { getDb } from "@/db";
import { parse, requireIdentity, route } from "@/features/queue/api";
import { stateInput } from "@/features/queue/input";
import { json } from "@/lib/http";
import { deskState } from "@/lib/queue";

export const GET = route(async (request: NextRequest) => {
  const { orgId } = await requireIdentity(request);
  const { counterId } = parse(
    stateInput,
    Object.fromEntries(request.nextUrl.searchParams),
  );
  return json(await deskState(getDb(), orgId, counterId));
});
