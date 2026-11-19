export function ticketNumber(prefix: string, sequence: number) {
  return `${prefix}-${String(sequence).padStart(2, "0")}`;
}

export function estimatedWait(
  waitingAhead: number,
  averageServiceSeconds: number | null,
  activeElapsedSeconds: number | null,
) {
  if (averageServiceSeconds === null) return 5 * waitingAhead;
  const remaining =
    activeElapsedSeconds === null
      ? 0
      : Math.max(0, averageServiceSeconds - activeElapsedSeconds);
  return Math.ceil((waitingAhead * averageServiceSeconds + remaining) / 60);
}
