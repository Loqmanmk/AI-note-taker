import { describe, expect, it } from "vitest";
import { formatRelativeDay, pickIndex } from "../lib/format";

describe("formatRelativeDay", () => {
  const now = new Date(2026, 10, 12, 15, 0); // Thursday 12 Nov 2026, local time

  it("names today and yesterday", () => {
    expect(formatRelativeDay(new Date(2026, 10, 12, 8, 30).toISOString(), now, "en-US")).toBe("Today");
    expect(formatRelativeDay(new Date(2026, 10, 11, 23, 0).toISOString(), now, "en-US")).toBe("Yesterday");
  });

  it("uses the weekday within the last week, then a date", () => {
    expect(formatRelativeDay(new Date(2026, 10, 9).toISOString(), now, "en-US")).toBe("Monday");
    expect(formatRelativeDay(new Date(2026, 9, 1).toISOString(), now, "en-US")).toBe("Oct 1, 2026");
  });

  it("returns nothing for an invalid date", () => {
    expect(formatRelativeDay("not a date", now)).toBe("");
  });
});

describe("pickIndex", () => {
  it("is stable, ignores case and stays in range", () => {
    expect(pickIndex("Biology", 6)).toBe(pickIndex("biology", 6));
    for (const word of ["Maths", "History", "", "Économie"]) {
      const i = pickIndex(word, 6);
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(6);
    }
  });
});
