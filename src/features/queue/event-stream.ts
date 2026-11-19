const intervalMs = 2_000;
export const streamDurationMs = 25_000;

export function eventStream<T>(
  initial: T,
  load: () => Promise<T>,
  signal: AbortSignal,
  deadline: number,
) {
  const encoder = new TextEncoder();
  let cleanup: () => void = () => {};

  return new ReadableStream<Uint8Array>({
    start(controller) {
      if (signal.aborted) {
        controller.close();
        return;
      }
      let previous = JSON.stringify(initial);
      let stopped = false;
      let pollTimer: ReturnType<typeof setTimeout> | undefined;
      const expiryTimer = setTimeout(close, Math.max(0, deadline - Date.now()));

      cleanup = () => {
        stopped = true;
        clearTimeout(pollTimer);
        clearTimeout(expiryTimer);
        signal.removeEventListener("abort", close);
      };

      function close() {
        if (stopped) return;
        cleanup();
        controller.close();
      }

      async function poll() {
        if (stopped) return;
        try {
          if ((controller.desiredSize ?? 0) > 0) {
            const serialized = JSON.stringify(await load());
            if (stopped) return;
            if (serialized !== previous) {
              controller.enqueue(
                encoder.encode(`event: update\ndata: ${serialized}\n\n`),
              );
              previous = serialized;
            }
          }
          pollTimer = setTimeout(poll, intervalMs);
        } catch {
          close();
        }
      }

      signal.addEventListener("abort", close, { once: true });
      controller.enqueue(
        encoder.encode(`retry: 2000\nevent: snapshot\ndata: ${previous}\n\n`),
      );
      pollTimer = setTimeout(poll, intervalMs);
    },
    cancel() {
      cleanup();
    },
  });
}
