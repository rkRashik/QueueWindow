import type { NextRequest } from "next/server";
import { getDb } from "@/db";
import { parseBody, requireIdentity, route } from "@/features/queue/api";
import { deskAction } from "@/features/queue/input";
import { json } from "@/lib/http";
import {
  callNext,
  completeTicket,
  issueTicket,
  recallTicket,
  skipTicket,
  toggleCounterStatus,
} from "@/lib/queue";

export const POST = route(async (request: NextRequest) => {
  const { orgId } = await requireIdentity(request);
  const input = await parseBody(request, deskAction);
  const db = getDb();
  const counterId = input.counterId;

  switch (input.action) {
    case "ISSUE_WALKIN":
      return json(
        {
          ticket: await issueTicket(
            db,
            orgId,
            counterId,
            input.idempotencyKey,
            { source: "walkin" },
          ),
        },
        201,
      );
    case "CALL_NEXT":
      return json({ ticket: await callNext(db, orgId, counterId) });
    case "COMPLETE":
      return json({
        ticket: await completeTicket(db, orgId, counterId, input.ticketId),
      });
    case "SKIP":
      return json({
        ticket: await skipTicket(db, orgId, counterId, input.ticketId),
      });
    case "RECALL":
      return json({
        ticket: await recallTicket(db, orgId, counterId, input.ticketId),
      });
    case "TOGGLE_PAUSE":
      return json({ counter: await toggleCounterStatus(db, orgId, counterId) });
  }
});
