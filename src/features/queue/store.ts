import { and, eq, sql } from "drizzle-orm";
import { counters, tickets } from "@/db/schema";
import { AppError } from "@/lib/app-error";

export const today = sql`(statement_timestamp() AT TIME ZONE 'Asia/Dhaka')::date`;

export function counterScope(orgId: string, counterId: string) {
  return and(eq(counters.orgId, orgId), eq(counters.id, counterId));
}

export function ticketScope(orgId: string, counterId: string) {
  return and(eq(tickets.orgId, orgId), eq(tickets.counterId, counterId));
}

export function counterMissing() {
  return new AppError("Counter not found.", 404);
}

export function ticketMissing() {
  return new AppError("Ticket not found.", 404);
}

export const ticketFields = {
  id: tickets.id,
  counterId: tickets.counterId,
  tokenNumber: tickets.tokenNumber,
  sequence: tickets.sequence,
  status: tickets.status,
  issuedAt: tickets.issuedAt,
  calledAt: tickets.calledAt,
  firstCalledAt: tickets.firstCalledAt,
  completedAt: tickets.completedAt,
};
