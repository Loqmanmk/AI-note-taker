import { describe, expect, it } from "vitest";
import { adminEmails } from "../lib/server/admin/adminAuth";
import { estimateAiCost } from "../lib/server/admin/costs";

describe("admin access list", () => {
  it("reads comma-separated emails, case-insensitively, and ignores junk", () => {
    expect([
      ...adminEmails(" Owner@Example.com, second@example.com ,, not-an-email "),
    ]).toEqual(["owner@example.com", "second@example.com"]);
    expect(adminEmails(undefined).size).toBe(0);
  });
});

describe("AI cost estimate", () => {
  it("prices transcribed classes far below classes Gemini listened to", () => {
    const hour = 3600;
    const transcript = estimateAiCost([
      { recording_seconds: hour, ai_path: "transcript" },
    ]);
    const audio = estimateAiCost([
      { recording_seconds: hour, ai_path: "audio" },
    ]);
    expect(transcript).toBeLessThan(audio);
    expect(estimateAiCost([{ recording_seconds: hour, ai_path: null }])).toBe(
      audio,
    ); // older rows count as audio
    expect(estimateAiCost([])).toBe(0);
  });
});
