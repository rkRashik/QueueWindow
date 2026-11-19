import { describe, expect, it } from "vitest";
import { estimatedWait, ticketNumber } from "../src/features/queue/rules";

describe("queue rules", () => {
  it("pads daily ticket sequences without truncating large sequences", () => {
    expect(ticketNumber("A", 1)).toBe("A-01");
    expect(ticketNumber("B2", 100)).toBe("B2-100");
  });

  it("reports no wait only when nobody is ahead and nobody is being served", () => {
    expect(estimatedWait(0, null, null)).toBe(0);
    expect(estimatedWait(0, 300, null)).toBe(0);
  });

  it("counts the visitor currently at the counter", () => {
    expect(estimatedWait(0, 300, 30)).toBe(5);
    // Overrunning service is "finishing soon", never "already done".
    expect(estimatedWait(0, 300, 900)).toBe(2);
  });

  it("falls back to four minutes per visitor until service data exists", () => {
    expect(estimatedWait(2, null, null)).toBe(8);
  });

  it("clamps implausible service samples so one stuck ticket cannot inflate the wait", () => {
    expect(estimatedWait(1, 7_200, null)).toBe(30);
    expect(estimatedWait(3, 5, null)).toBe(3);
  });

  it("rounds long waits to five minutes so the estimate never reads falsely precise", () => {
    expect(estimatedWait(4, 250, null)).toBe(15);
    expect(estimatedWait(7, 300, null)).toBe(35);
    expect(estimatedWait(3, 300, null)).toBe(15);
  });
});
