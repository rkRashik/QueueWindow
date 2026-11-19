import type { NextRequest } from "next/server";
import { getDb } from "@/db";
import { updateOrganization } from "@/features/queue/admin";
import { parseBody, requireIdentity, route } from "@/features/queue/api";
import { organizationPatch } from "@/features/queue/input";
import { json } from "@/lib/http";

export const PATCH = route(async (request: NextRequest) => {
  const { orgId } = await requireIdentity(request, true);
  const input = await parseBody(request, organizationPatch);
  return json({
    organization: await updateOrganization(getDb(), orgId, input),
  });
});
