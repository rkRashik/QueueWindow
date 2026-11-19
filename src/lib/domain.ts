export type TicketState =
  "waiting" | "called" | "serving" | "completed" | "absent" | "cancelled";
export type Ticket = {
  id: string;
  number: number;
  state: TicketState;
  issuedAt: number;
  finishedAt: number | null;
};
export type Queue = {
  id: string;
  name: string;
  desk: string;
  message: string;
  paused: boolean;
  version: number;
  displayId: string;
  demo: boolean;
  expiresAt: number | null;
};
export type Snapshot = Queue & { tickets: Ticket[]; updatedAt: number };
export type VisitorView = {
  name: string;
  desk: string;
  message: string;
  paused: boolean;
  ticket: Omit<Ticket, "id">;
  ahead: number;
  current: number | null;
  version: number;
  demo: boolean;
};
export type DisplayView = {
  name: string;
  desk: string;
  message: string;
  paused: boolean;
  current: { number: number; state: TicketState } | null;
  upcoming: number[];
  waiting: number;
  version: number;
  demo: boolean;
};
export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
const transitions: Record<TicketState, TicketState[]> = {
  waiting: ["called", "cancelled"],
  called: ["serving", "absent"],
  serving: ["completed"],
  completed: [],
  absent: [],
  cancelled: [],
};
export function allowedTransition(from: TicketState, to: TicketState) {
  return transitions[from].includes(to);
}
export const ticketLabel = (n: number) => `A${String(n).padStart(3, "0")}`;
export const isActive = (s: TicketState) => s === "called" || s === "serving";
export const isTerminal = (s: TicketState) =>
  ["completed", "absent", "cancelled"].includes(s);
