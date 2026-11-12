import type { NotesRequest, StudyPack } from "../schema";

export type GenerationResult = { pack: StudyPack; demo: boolean };

/**
 * Turns a transcript into a study pack.
 * The API route depends on this interface only, so the AI provider can be
 * swapped (or faked in tests) without touching the route.
 */
export interface StudyPackGenerator {
  generate(request: NotesRequest): Promise<GenerationResult>;
}

export type GenerationErrorCode = "declined" | "too_long" | "rate_limited" | "misconfigured" | "unavailable";

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
