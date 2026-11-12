import "server-only";
import { ApiError, FinishReason, GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { StudyPackSchema, sanitizeStudyPack, type NotesRequest } from "../schema";
import { SYSTEM_PROMPT, buildUserMessage } from "./prompt";
import { GenerationError, type GenerationResult, type StudyPackGenerator } from "./studyPackGenerator";

const DEFAULT_MODEL = "gemini-3.8-flash";

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
    private readonly model: string = process.env.GEMINI_MODEL || DEFAULT_MODEL,
  ) {}

  async generate(request: NotesRequest): Promise<GenerationResult> {
    const response = await this.callModel(request);
    const finishReason = response.candidates?.[0]?.finishReason;

    if (response.promptFeedback?.blockReason || finishReason === FinishReason.SAFETY) {
      throw new GenerationError("declined");
    }
    if (finishReason === FinishReason.MAX_TOKENS) throw new GenerationError("too_long");

    return { pack: sanitizeStudyPack(this.parsePack(response.text)), demo: false };
  }

  private async callModel(request: NotesRequest) {
    try {
      return await this.client.models.generateContent({
        model: this.model,
        contents: buildUserMessage(request),
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
          responseJsonSchema: this.responseSchema,
        },
      });
    } catch (err) {
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

function classifyApiError(err: ApiError) {
  if (err.status === 429) return "rate_limited";
  // Gemini reports a bad key as a 400, not a 401.
  if (err.status === 401 || err.status === 403 || /api key/i.test(err.message)) return "misconfigured";
  return "unavailable";
}
