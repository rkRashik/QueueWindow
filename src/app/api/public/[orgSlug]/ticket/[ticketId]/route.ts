import { getDb } from "@/db";
import { parse, route } from "@/features/queue/api";
import { id, slug } from "@/features/queue/input";
import { organizationBySlug, visitorTicket } from "@/features/queue/public";
import { json } from "@/lib/http";

export const GET = route(
  async (
    _request: Request,
    { params }: { params: Promise<{ orgSlug: string; ticketId: string }> },
  ) => {
    const input = await params;
    const orgSlug = parse(slug, input.orgSlug);
    const ticketId = parse(id, input.ticketId);
    const db = getDb();
    const { id: orgId } = await organizationBySlug(db, orgSlug);
    return json(await visitorTicket(db, orgId, ticketId));
  },
);
