import { z } from "zod";
import { StudyPackSchema, type SavedClass } from "./schema";

/** The table that holds each student's saved classes (see supabase/migrations). */
export const CLASSES_TABLE = "classes";
export const CLASS_COLUMNS = "id, created_at, pack";
export const CLASS_LIST_LIMIT = 100;

const ClassRowSchema = z.object({ id: z.string(), created_at: z.string(), pack: StudyPackSchema });

/**
 * Turns rows from the database into saved classes.
 * Rows are written by clients too, so each one is validated and bad rows are skipped.
 */
export function rowsToSavedClasses(rows: unknown): SavedClass[] {
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row) => {
    const parsed = ClassRowSchema.safeParse(row);
    return parsed.success
      ? [{ id: parsed.data.id, date: parsed.data.created_at, pack: parsed.data.pack, demo: false }]
      : [];
  });
}
