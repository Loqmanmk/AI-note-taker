import { z } from "zod";
import { StudyPackSchema, type SavedClass } from "./schema";

/** The table that holds each student's saved classes (see supabase/migrations). */
export const CLASSES_TABLE = "classes";
export const CLASS_COLUMNS = "id, created_at, status, error, pack";
export const CLASS_LIST_LIMIT = 100;

/** A class whose notes are being written in the background, or could not be written. */
export type PendingClass = { id: string; date: string; status: "processing" | "failed"; error?: string };

const ReadyRowSchema = z.object({
  id: z.string(),
  created_at: z.string(),
  status: z.literal("ready").optional(), // Rows from before background jobs have no status.
  pack: StudyPackSchema,
});

const PendingRowSchema = z.object({
  id: z.string(),
  created_at: z.string(),
  status: z.enum(["processing", "failed"]),
  error: z.string().nullable().optional(),
});

/**
 * Turns rows from the database into saved classes, keeping only those with notes.
 * Rows are written by clients too, so each one is validated and bad rows are skipped.
 */
export function rowsToSavedClasses(rows: unknown): SavedClass[] {
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row) => {
    const parsed = ReadyRowSchema.safeParse(row);
    return parsed.success
      ? [{ id: parsed.data.id, date: parsed.data.created_at, pack: parsed.data.pack, demo: false }]
      : [];
  });
}

/** The rows still being written, or that failed. */
export function rowsToPendingClasses(rows: unknown): PendingClass[] {
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row) => {
    const parsed = PendingRowSchema.safeParse(row);
    if (!parsed.success) return [];
    const { id, created_at, status, error } = parsed.data;
    return [{ id, date: created_at, status, ...(error ? { error } : {}) }];
  });
}
