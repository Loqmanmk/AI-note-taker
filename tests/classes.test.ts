import { describe, expect, it } from "vitest";
import { rowsToSavedClasses } from "../lib/classes";
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
