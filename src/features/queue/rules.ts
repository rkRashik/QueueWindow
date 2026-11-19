export function ticketNumber(prefix: string, sequence: number) {
  return `${prefix}-${String(sequence).padStart(2, "0")}`;
}

/** Service samples outside this window (mis-clicks, tickets left open) are ignored. */
export const serviceSampleSeconds = { min: 15, max: 1_800 } as const;
const fallbackServiceSeconds = 240;

/**
 * Minutes until a newly joined visitor reaches the counter; 0 means no wait.
 * `typicalServiceSeconds` is the recent median (see `typicalService`), clamped again
 * here so a bad sample can never produce an absurd promise.
 */
export function estimatedWait(
  waitingAhead: number,
  typicalServiceSeconds: number | null,
  activeElapsedSeconds: number | null,
) {
  const perVisitor = Math.min(
    Math.max(typicalServiceSeconds ?? fallbackServiceSeconds, 60),
    serviceSampleSeconds.max,
  );
  const active =
    activeElapsedSeconds === null
      ? 0
      : Math.max(perVisitor - activeElapsedSeconds, perVisitor / 4);
  const seconds = waitingAhead * perVisitor + active;
  if (seconds <= 0) return 0;
  const minutes = Math.ceil(seconds / 60);
  return minutes > 15 ? Math.round(minutes / 5) * 5 : minutes;
}
