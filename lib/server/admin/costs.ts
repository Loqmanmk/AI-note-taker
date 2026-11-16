/**
 * Rough AI prices used for the admin console's cost estimate, in US dollars. They come from public
 * price lists and change over time: update them from the Gemini and Groq pricing pages.
 */
export const AI_COST_ESTIMATE = {
  /** Gemini listening to one hour of audio (about 115,000 audio tokens at ~$1 per million, plus output). */
  audioPerHour: 0.13,
  /** Groq Whisper per hour of audio (free up to a daily amount, then about $0.04). */
  transcriptionPerHour: 0.04,
  /** Gemini writing notes from text, per class. */
  textPerClass: 0.01,
} as const;

export type UsageRow = { recording_seconds: number; ai_path: string | null };

/** Estimated AI cost of a set of classes. Classes recorded before the path was saved count as audio. */
export function estimateAiCost(rows: UsageRow[]): number {
  let cost = 0;
  for (const row of rows) {
    const hours = row.recording_seconds / 3600;
    if (row.ai_path === "transcript")
      cost +=
        hours * AI_COST_ESTIMATE.transcriptionPerHour +
        AI_COST_ESTIMATE.textPerClass;
    else if (row.ai_path === "text") cost += AI_COST_ESTIMATE.textPerClass;
    else cost += hours * AI_COST_ESTIMATE.audioPerHour;
  }
  return Math.round(cost * 100) / 100;
}
