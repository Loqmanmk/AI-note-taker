/** One recognised sentence, with the time (seconds from the start) it was said. */
export type Segment = { t: number; text: string };

export type TranscriptLine =
  | { kind: "speech"; t: number; text: string }
  | { kind: "lost"; t: number; marker: number };

/** Seconds → "mm:ss". */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** Merges speech and "I'm lost" presses into one timeline. */
export function buildTimeline(segments: Segment[], lostTimes: number[]): TranscriptLine[] {
  const lines: TranscriptLine[] = [
    ...segments.map((s) => ({ kind: "speech" as const, t: s.t, text: s.text })),
    ...lostTimes.map((t, i) => ({ kind: "lost" as const, t, marker: i + 1 })),
  ];
  return lines.sort((a, b) => a.t - b.t);
}

/** The text sent to the AI. The marker wording must match the system prompt. */
export function timelineToText(lines: TranscriptLine[]): string {
  return lines
    .map((line) =>
      line.kind === "speech"
        ? `[${formatClock(line.t)}] ${line.text}`
        : `>>> STUDENT PRESSED "I'M LOST" HERE (marker #${line.marker}) <<<`,
    )
    .join("\n");
}
