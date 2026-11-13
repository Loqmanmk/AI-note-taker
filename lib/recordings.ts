import { AUDIO_EXTENSION_TYPES } from "./constants";

/**
 * Recordings are uploaded by the phone to Supabase Storage first, because hosting platforms cap
 * request bodies (Vercel: 4.5 MB) while an hour of class is about 15 MB. The server reads the file
 * from there, writes the notes, then deletes it.
 */
export const RECORDINGS_BUCKET = "recordings";

/** Where one recording goes: a folder per student, which the storage rules restrict to its owner. */
export function recordingPath(userId: string, recordingId: string, extension = "m4a"): string {
  return `${userId}/${recordingId}.${extension}`;
}

const SAFE_NAME = /^[A-Za-z0-9_-]{1,100}$/;

/**
 * Whether a path sent by a client points at one of that student's own recordings.
 * The storage rules enforce ownership too; this also blocks odd paths before any download.
 */
export function isOwnRecordingPath(userId: string, path: string): boolean {
  const parts = path.split("/");
  if (parts.length !== 2 || parts[0] !== userId) return false;
  const dot = parts[1].lastIndexOf(".");
  if (dot <= 0) return false;
  const name = parts[1].slice(0, dot);
  const extension = parts[1].slice(dot + 1).toLowerCase();
  return SAFE_NAME.test(name) && extension in AUDIO_EXTENSION_TYPES;
}
