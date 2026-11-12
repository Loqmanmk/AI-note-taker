import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CLASSES_TABLE, CLASS_COLUMNS, CLASS_LIST_LIMIT, rowsToSavedClasses } from "@/lib/classes";
import { getSupabase } from "@/lib/client/supabase";
import type { SavedClass } from "@/lib/schema";

type Loaded = { userId: string; items: SavedClass[] };

async function fetchClasses(supabase: SupabaseClient): Promise<{ items: SavedClass[] } | { error: string }> {
  const { data, error } = await supabase
    .from(CLASSES_TABLE)
    .select(CLASS_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(CLASS_LIST_LIMIT);
  return error ? { error: "Could not load your classes." } : { items: rowsToSavedClasses(data) };
}

/** The signed-in student's classes, stored in their account. */
export function useCloudClasses(userId: string | undefined) {
  const supabase = getSupabase();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase || !userId) return;
    let active = true;
    fetchClasses(supabase).then((result) => {
      // Ignore an answer that arrives after the student switched accounts or left.
      if (!active) return;
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setError("");
      setLoaded({ userId, items: result.items });
    });
    return () => {
      active = false;
    };
  }, [supabase, userId]);

  // Classes of a previous account never show after switching accounts.
  const items = loaded && loaded.userId === userId ? loaded.items : [];

  return {
    items,
    error,
    /** The server has already saved the class; this only shows it straight away. */
    add: (item: SavedClass) => {
      if (userId) setLoaded({ userId, items: [item, ...items.filter((existing) => existing.id !== item.id)] });
    },
    remove: async (id: string) => {
      if (!supabase || !userId) return;
      const { error: deleteError } = await supabase.from(CLASSES_TABLE).delete().eq("id", id);
      if (deleteError) {
        setError("Could not delete the class. Try again.");
        return;
      }
      setLoaded({ userId, items: items.filter((item) => item.id !== id) });
    },
  };
}
