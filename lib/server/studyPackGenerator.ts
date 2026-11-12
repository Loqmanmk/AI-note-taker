import type { AudioNotesFields, NotesRequest, StudyPack } from "../schema";

export type GenerationResult = { pack: StudyPack; demo: boolean };

/**
 * Turns a transcript into a study pack.
 * The API route depends on this interface only, so the AI provider can be
 * swapped (or faked in tests) without touching the route.
 */
export interface StudyPackGenerator {
  generate(request: NotesRequest): Promise<GenerationResult>;
}

export type AudioNotesRequest = AudioNotesFields & { audio: Blob; mimeType: string };

/**
 * Turns a recording of a class into a study pack.
 * Kept separate from StudyPackGenerator because not every AI provider can listen to audio.
 */
export interface AudioStudyPackGenerator {
  generateFromAudio(request: AudioNotesRequest): Promise<GenerationResult>;
}

export function supportsAudio<T extends object>(generator: T): generator is T & AudioStudyPackGenerator {
  return typeof (generator as Partial<AudioStudyPackGenerator>).generateFromAudio === "function";
}

export type GenerationErrorCode = "declined" | "too_long" | "rate_limited" | "misconfigured" | "unavailable" | "timeout";

/** How long to wait for one AI request before giving up, so the student is never left waiting forever. */
export const GENERATION_TIMEOUT_MS = 120_000;

/** A failure the user can be told about. Anything else is a bug and stays a 500. */
export class GenerationError extends Error {
  constructor(
    readonly code: GenerationErrorCode,
    options?: ErrorOptions,
  ) {
    super(code, options);
    this.name = "GenerationError";
  }
}
