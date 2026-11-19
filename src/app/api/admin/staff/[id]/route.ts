import type { NextRequest } from "next/server";
import { getDb } from "@/db";
import { deleteStaff } from "@/features/queue/admin";
import { parse, requireIdentity, route } from "@/features/queue/api";
import { id } from "@/features/queue/input";
import { json } from "@/lib/http";

export const DELETE = route(
  async (
    request: NextRequest,
    context: { params: Promise<{ id: string }> },
  ) => {
    const user = await requireIdentity(request, true);
    await deleteStaff(
      getDb(),
      user.orgId,
      user.id,
      parse(id, (await context.params).id),
    );
    return json({ ok: true });
  },
);
