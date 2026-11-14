import { describe, expect, it } from "vitest";
import { rowsToPendingClasses, rowsToSavedClasses } from "../lib/classes";
import { SAMPLE_PACK } from "../lib/sample";
import { readSupabaseConfig } from "../lib/supabaseConfig";

describe("rowsToSavedClasses", () => {
  it("turns valid rows into saved classes and skips broken ones", () => {
    const rows = [
      { id: "a", created_at: "2026-11-12T10:00:00Z", pack: SAMPLE_PACK },
      { id: "b", created_at: "2026-11-12T11:00:00Z", pack: { title: "missing fields" } },
      "not a row",
    ];
    expect(rowsToSavedClasses(rows)).toEqual([
      { id: "a", date: "2026-11-12T10:00:00Z", pack: SAMPLE_PACK, demo: false },
    ]);
  });

  it("returns nothing for a non-list", () => {
    expect(rowsToSavedClasses(null)).toEqual([]);
  });

  it("keeps only finished classes", () => {
    const rows = [
      { id: "ready", created_at: "t", status: "ready", pack: SAMPLE_PACK },
      { id: "busy", created_at: "t", status: "processing", pack: null },
      { id: "bad", created_at: "t", status: "failed", error: "Busy", pack: null },
    ];
    expect(rowsToSavedClasses(rows).map((c) => c.id)).toEqual(["ready"]);
  });
});

describe("rowsToPendingClasses", () => {
  it("lists classes being written and failed ones, with their reason", () => {
    const rows = [
      { id: "ready", created_at: "t", status: "ready", pack: SAMPLE_PACK },
      { id: "busy", created_at: "t1", status: "processing", error: null, pack: null },
      { id: "bad", created_at: "t2", status: "failed", error: "The AI service is busy.", pack: null },
    ];
    expect(rowsToPendingClasses(rows)).toEqual([
      { id: "busy", date: "t1", status: "processing" },
      { id: "bad", date: "t2", status: "failed", error: "The AI service is busy." },
    ]);
  });
});

describe("readSupabaseConfig", () => {
  it("needs both values and trims them", () => {
    expect(readSupabaseConfig(" https://x.supabase.co/ ", " key ")).toEqual({
      url: "https://x.supabase.co",
      publishableKey: "key",
    });
    expect(readSupabaseConfig("https://x.supabase.co", "")).toBeNull();
    expect(readSupabaseConfig(undefined, "key")).toBeNull();
  });
});
