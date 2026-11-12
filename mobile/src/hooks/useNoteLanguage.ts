import { useCallback, useEffect, useState } from "react";
import type { NoteLanguage } from "@shared/constants";
import { loadNoteLanguage, saveNoteLanguage } from "@/lib/preferences";

/** The notes language, remembered between visits. */
export function useNoteLanguage() {
  const [language, setLanguageState] = useState<NoteLanguage>("auto");

  useEffect(() => {
    let cancelled = false;
    loadNoteLanguage().then((stored) => {
      if (!cancelled) setLanguageState(stored);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setLanguage = useCallback((next: NoteLanguage) => {
    setLanguageState(next);
    saveNoteLanguage(next);
  }, []);

  return [language, setLanguage] as const;
}
