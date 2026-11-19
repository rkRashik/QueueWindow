import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  eventStream,
  streamDurationMs,
} from "../src/features/queue/event-stream";

const decode = (data: Uint8Array | undefined) => new TextDecoder().decode(data);

describe("public display stream", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("emits the initial snapshot, only emits changes, and closes at its deadline", async () => {
    const signal = new AbortController().signal;
    const load = vi.fn().mockResolvedValue({ calledAt: "first" });
    const reader = eventStream(
      { calledAt: "first" },
      load,
      signal,
      Date.now() + streamDurationMs,
    ).getReader();
    expect(decode((await reader.read()).value)).toBe(
      'retry: 2000\nevent: snapshot\ndata: {"calledAt":"first"}\n\n',
    );

    const update = reader.read();
    let emitted = false;
    void update.then(() => {
      emitted = true;
    });
    await vi.advanceTimersByTimeAsync(2_000);
    expect(load).toHaveBeenCalledTimes(1);
    expect(emitted).toBe(false);

    load.mockResolvedValue({ calledAt: "recalled" });
    await vi.advanceTimersByTimeAsync(2_000);
    expect(decode((await update).value)).toBe(
      'event: update\ndata: {"calledAt":"recalled"}\n\n',
    );

    await vi.advanceTimersByTimeAsync(20_999);
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(await reader.read()).toMatchObject({ done: true });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cancels scheduled polling when the client disconnects", async () => {
    const abort = new AbortController();
    const load = vi.fn();
    const reader = eventStream(
      {},
      load,
      abort.signal,
      Date.now() + streamDurationMs,
    ).getReader();
    await reader.read();
    abort.abort();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(await reader.read()).toMatchObject({ done: true });
    expect(load).not.toHaveBeenCalled();
  });
});
