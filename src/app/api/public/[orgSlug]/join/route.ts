import { getDb } from "@/db";
import { parse, parseBody, route } from "@/features/queue/api";
import { clientBucket } from "@/features/queue/client-ip";
import { joinInput, slug } from "@/features/queue/input";
import { organizationBySlug } from "@/features/queue/public";
import { json } from "@/lib/http";
import { issueTicket } from "@/lib/queue";

export const POST = route(
  async (
    request: Request,
    { params }: { params: Promise<{ orgSlug: string }> },
  ) => {
    const orgSlug = parse(slug, (await params).orgSlug);
    const input = await parseBody(request, joinInput);
    const db = getDb();
    const { id: orgId } = await organizationBySlug(db, orgSlug);
    const ticket = await issueTicket(
      db,
      orgId,
      input.counterId,
      input.idempotencyKey,
      {
        source: "public",
        clientHash: clientBucket(request.headers, orgId),
      },
    );
    return json(
      {
        ticketId: ticket.id,
        counterId: ticket.counterId,
        tokenNumber: ticket.tokenNumber,
        status: ticket.status,
        issuedAt: ticket.issuedAt,
      },
      201,
    );
  },
);
