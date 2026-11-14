import { z } from "zod";
import { LOST_MARKERS_MAX, NOTE_LANGUAGE_CODES, TRANSCRIPT_MAX_CHARS, TRANSCRIPT_MIN_CHARS } from "./constants";

/** Everything the student gets back after a class. Also the shape the AI must fill. */
export const StudyPackSchema = z.object({
  title: z.string().describe("Short title for this class session"),
  subject: z.string().describe("Subject or course, e.g. 'Biology'"),
  summary: z.string().describe("4-6 sentence summary of the whole class"),
  notes: z.array(
    z.object({
      heading: z.string(),
      points: z.array(z.string()),
    }),
  ),
  focus: z.array(
    z.object({
      topic: z.string(),
      priority: z.enum(["high", "medium", "low"]),
      why: z.string().describe("Why the student should focus on this"),
      evidence: z
        .string()
        .describe("Short quote or moment from the transcript that shows the teacher's emphasis. Empty if none."),
    }),
  ),
  key_terms: z.array(z.object({ term: z.string(), definition: z.string() })),
  quiz: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()).describe("Exactly 4 options"),
      correct_index: z.number().describe("0-based index of the correct option"),
      explanation: z.string(),
      topic: z.string().describe("Which focus topic this question tests"),
    }),
  ),
  lost_moments: z.array(
    z.object({
      marker: z.number().describe("The number of the I'M LOST marker"),
      what_was_said: z.string().describe("What the teacher was explaining at that moment"),
      simple_explanation: z.string().describe("The same idea re-explained simply, with an example"),
    }),
  ),
  next_steps: z.array(z.string()).describe("Concrete things to do before the next class"),
});

export type StudyPack = z.infer<typeof StudyPackSchema>;

/** Body of POST /api/notes. */
export const NotesRequestSchema = z.object({
  transcript: z
    .string()
    .trim()
    .min(TRANSCRIPT_MIN_CHARS, "The transcript is too short to make notes from.")
    .max(TRANSCRIPT_MAX_CHARS, "The transcript is too long. Split the class into two parts."),
  language: z.enum(NOTE_LANGUAGE_CODES, "Unsupported notes language.").default("auto"),
});

export type NotesRequest = z.infer<typeof NotesRequestSchema>;

/** Text fields sent with a recording to POST /api/notes/audio. */
export const AudioNotesFieldsSchema = z.object({
  language: z.enum(NOTE_LANGUAGE_CODES, "Unsupported notes language.").default("auto"),
  /** Seconds from the start of the recording at which the student pressed "I'm lost". */
  lostTimes: z.array(z.number().min(0).max(86_400)).max(LOST_MARKERS_MAX).default([]),
});
export type AudioNotesFields = z.infer<typeof AudioNotesFieldsSchema>;

/** Body of POST /api/notes/audio when the recording was first uploaded to storage. */
export const StoredRecordingRequestSchema = AudioNotesFieldsSchema.extend({
  recordingPath: z.string().min(1).max(300),
});

export const NotesResponseSchema = z.object({
  pack: StudyPackSchema,
  demo: z.boolean(),
  /** Set when the class was saved to the student's account. */
  classId: z.string().optional(),
});
export type NotesResponse = z.infer<typeof NotesResponseSchema>;

/** Answer of POST /api/notes/audio when the notes are written in the background. */
export const NotesJobResponseSchema = z.object({
  classId: z.string(),
  status: z.literal("processing"),
});
export type NotesJobResponse = z.infer<typeof NotesJobResponseSchema>;

/** A study pack saved in the browser. */
export const SavedClassSchema = z.object({
  id: z.string(),
  date: z.string(),
  pack: StudyPackSchema,
  demo: z.boolean(),
});
export type SavedClass = z.infer<typeof SavedClassSchema>;

/**
 * The AI's output is schema-valid but not guaranteed to be coherent.
 * Drop quiz questions the UI could not render or grade.
 */
export function sanitizeStudyPack(pack: StudyPack): StudyPack {
  return {
    ...pack,
    quiz: pack.quiz.filter(
      (q) =>
        q.options.length >= 2 &&
        Number.isInteger(q.correct_index) &&
        q.correct_index >= 0 &&
        q.correct_index < q.options.length,
    ),
  };
}
