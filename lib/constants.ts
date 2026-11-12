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

/** About three hours of class at the bitrate the mobile app records with. */
export const AUDIO_MAX_BYTES = 50 * 1024 * 1024;
export const AUDIO_MIN_BYTES = 2 * 1024;
export const LOST_MARKERS_MAX = 200;

/** Audio types the server accepts, mapped to the type name sent to the AI. */
export const AUDIO_MIME_TYPES: Record<string, string> = {
  "audio/mp4": "audio/mp4",
  "audio/m4a": "audio/mp4",
  "audio/x-m4a": "audio/mp4",
  "audio/aac": "audio/aac",
  "audio/mpeg": "audio/mpeg",
  "audio/mp3": "audio/mpeg",
  "audio/wav": "audio/wav",
  "audio/x-wav": "audio/wav",
  "audio/webm": "audio/webm",
  "audio/ogg": "audio/ogg",
};
