import { describe, expect, it } from "vitest";
import { buildTimeline, formatClock, timelineToText } from "../lib/transcript";

describe("formatClock", () => {
  it("formats seconds as mm:ss", () => {
    expect(formatClock(0)).toBe("00:00");
    expect(formatClock(75.9)).toBe("01:15");
    expect(formatClock(-3)).toBe("00:00");
  });
});

describe("timeline", () => {
  const segments = [
    { t: 5, text: "First" },
    { t: 20, text: "Second" },
  ];

  it("places lost markers between the sentences around them", () => {
    const text = timelineToText(buildTimeline(segments, [10]));
    expect(text.split("\n")).toEqual([
      "[00:05] First",
      '>>> STUDENT PRESSED "I\'M LOST" HERE (marker #1) <<<',
      "[00:20] Second",
    ]);
  });

  it("numbers markers in the order they were pressed", () => {
    const lost = buildTimeline(segments, [10, 30]).filter((l) => l.kind === "lost");
    expect(lost.map((l) => l.marker)).toEqual([1, 2]);
  });

  it("is empty when nothing was said", () => {
    expect(timelineToText(buildTimeline([], []))).toBe("");
  });
});
