import "server-only";
import { ApiError, FinishReason, GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { StudyPackSchema, sanitizeStudyPack, type NotesRequest } from "../schema";
import { SYSTEM_PROMPT, buildUserMessage } from "./prompt";
import {
  GenerationError,
  type GenerationErrorCode,
  type GenerationResult,
  type StudyPackGenerator,
} from "./studyPackGenerator";

/**
 * Tried in order. Free-tier models are often overloaded or out of quota one at
 * a time, so when one does not answer the next one usually does.
 */
const DEFAULT_MODELS = ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-2.5-flash"];
const ATTEMPT_TIMEOUT_MS = 60_000;

/** Failures that are about one model's availability, where another model may work. */
const RETRY_ON_NEXT_MODEL: GenerationErrorCode[] = ["timeout", "unavailable", "rate_limited"];

function modelsFromEnv(): string[] {
  const configured = (process.env.GEMINI_MODEL ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
  return configured.length ? configured : DEFAULT_MODELS;
}

/** Gemini accepts JSON Schema, but not the "$schema" keyword Zod adds at the top. */
function buildResponseSchema() {
  const schema: Record<string, unknown> = { ...z.toJSONSchema(StudyPackSchema) };
  delete schema.$schema;
  return schema;
}

export class GeminiStudyPackGenerator implements StudyPackGenerator {
  private readonly responseSchema = buildResponseSchema();

  constructor(
    private readonly client: GoogleGenAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }),
    private readonly models: string[] = modelsFromEnv(),
    private readonly attemptTimeoutMs: number = ATTEMPT_TIMEOUT_MS,
  ) {}

  async generate(request: NotesRequest): Promise<GenerationResult> {
    let lastError: unknown;
    for (const model of this.models) {
      try {
        return await this.generateWith(model, request);
      } catch (err) {
        const retryable = err instanceof GenerationError && RETRY_ON_NEXT_MODEL.includes(err.code);
        if (!retryable) throw err;
        console.warn(`[notes] ${model} failed (${err.code}), trying the next model`);
        lastError = err;
      }
    }
    throw lastError;
  }

  private async generateWith(model: string, request: NotesRequest): Promise<GenerationResult> {
    const response = await this.callModel(model, request);
    const finishReason = response.candidates?.[0]?.finishReason;

    if (response.promptFeedback?.blockReason || finishReason === FinishReason.SAFETY) {
      throw new GenerationError("declined");
    }
    if (finishReason === FinishReason.MAX_TOKENS) throw new GenerationError("too_long");

    return { pack: sanitizeStudyPack(this.parsePack(response.text)), demo: false };
  }

  private async callModel(model: string, request: NotesRequest) {
    const timeout = AbortSignal.timeout(this.attemptTimeoutMs);
    try {
      return await this.client.models.generateContent({
        model,
        contents: buildUserMessage(request),
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
          responseJsonSchema: this.responseSchema,
          abortSignal: timeout,
        },
      });
    } catch (err) {
      if (timeout.aborted) throw new GenerationError("timeout", { cause: err });
      if (err instanceof ApiError) throw new GenerationError(classifyApiError(err), { cause: err });
      throw err;
    }
  }

  /** The model is asked for schema-valid JSON, but its answer is still untrusted input. */
  private parsePack(text: string | undefined) {
    try {
      return StudyPackSchema.parse(JSON.parse(text ?? ""));
    } catch (err) {
      throw new GenerationError("unavailable", { cause: err });
    }
  }
}

function classifyApiError(err: ApiError): GenerationErrorCode {
  if (err.status === 429) return "rate_limited";
  // Gemini reports a bad key as a 400, not a 401.
  if (err.status === 401 || err.status === 403 || /api key/i.test(err.message)) return "misconfigured";
  return "unavailable";
}
