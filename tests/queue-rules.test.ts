import { describe, expect, it } from "vitest";
import { estimatedWait, ticketNumber } from "../src/features/queue/rules";

describe("queue rules", () => {
  it("pads daily ticket sequences without truncating large sequences", () => {
    expect(ticketNumber("A", 1)).toBe("A-01");
    expect(ticketNumber("B2", 100)).toBe("B2-100");
  });

  it("uses five minutes per waiting ticket until service data is available", () => {
    expect(estimatedWait(2, null, null)).toBe(10);
    expect(estimatedWait(0, null, 15)).toBe(0);
  });

  it("adds estimated remaining active service to the observed waiting rate", () => {
    expect(estimatedWait(2, 90, 30)).toBe(4);
    expect(estimatedWait(1, 60, 80)).toBe(1);
  });
});
