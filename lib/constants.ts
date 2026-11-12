/** Languages the browser can transcribe, as [BCP 47 code, label]. */
export const SPEECH_LANGUAGES = [
  ["en-US", "English"],
  ["fr-FR", "Français"],
  ["ar-MA", "العربية"],
  ["es-ES", "Español"],
  ["de-DE", "Deutsch"],
] as const;

/** Languages the study pack can be written in. "auto" follows the transcript. */
export const NOTE_LANGUAGES = {
  auto: "Same as the class",
  English: "English",
  French: "French",
  Arabic: "Arabic",
  Spanish: "Spanish",
  German: "German",
} as const;

export type NoteLanguage = keyof typeof NOTE_LANGUAGES;
export const NOTE_LANGUAGE_CODES = Object.keys(NOTE_LANGUAGES) as [NoteLanguage, ...NoteLanguage[]];

export const TRANSCRIPT_MIN_CHARS = 40;
/** Roughly a three-hour lecture. Bounds request size and AI cost. */
export const TRANSCRIPT_MAX_CHARS = 150_000;

export const HISTORY_MAX_ITEMS = 30;
