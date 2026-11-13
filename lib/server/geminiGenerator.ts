import "server-only";
import {
  ApiError,
  FileState,
  FinishReason,
  GoogleGenAI,
  createPartFromUri,
  createUserContent,
  type ContentListUnion,
  type File as GeminiFile,
} from "@google/genai";
import { z } from "zod";
import { StudyPackSchema, sanitizeStudyPack, type NotesRequest } from "../schema";
import { SYSTEM_PROMPT, buildAudioMessage, buildUserMessage } from "./prompt";
import {
  GenerationError,
  type AudioNotesRequest,
  type AudioStudyPackGenerator,
  type GenerationErrorCode,
  type GenerationResult,
  type StudyPackGenerator,
} from "./studyPackGenerator";

/**
 * Tried in order. Free-tier models are often overloaded or out of quota one at
 * a time, so when one does not answer the next one usually does.
 */
const DEFAULT_MODELS = ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-2.5-flash"];

export type GeminiTimeouts = {
  /** One attempt at writing notes from text. */
  textMs: number;
  /** One attempt at writing notes from a recording, which takes longer to listen to. */
  audioMs: number;
  /** Uploading a recording and waiting for Google to finish processing it. */
  uploadMs: number;
  /** Pause between checks while a recording is being processed. */
  pollMs: number;
  /**
   * Everything for one request, retries included. Hosting platforms stop a request after a fixed
   * time (Vercel's free plan: 300 s), so the generator gives up with a clear error before that.
   */
  totalMs: number;
  /** A new model is only tried when at least this much of the total time is left. */
  minAttemptMs: number;
};

const DEFAULT_TIMEOUTS: GeminiTimeouts = {
  textMs: 60_000,
  audioMs: 120_000,
  uploadMs: 90_000,
  pollMs: 2_000,
  totalMs: 270_000,
  minAttemptMs: 20_000,
};

/** A wrong key fails on every model, so there is no point trying the others. */
const NEVER_RETRY: GenerationErrorCode[] = ["misconfigured"];

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

export class GeminiStudyPackGenerator implements StudyPackGenerator, AudioStudyPackGenerator {
  private readonly responseSchema = buildResponseSchema();
  private readonly timeouts: GeminiTimeouts;

  /** The model that answered last time. It is tried first, so a busy model only costs one wait. */
  private preferredModel: string | undefined;

  constructor(
    private readonly client: GoogleGenAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }),
    private readonly models: string[] = modelsFromEnv(),
    timeouts: Partial<GeminiTimeouts> = {},
  ) {
    this.timeouts = { ...DEFAULT_TIMEOUTS, ...timeouts };
  }

  generate(request: NotesRequest): Promise<GenerationResult> {
    const deadline = Date.now() + this.timeouts.totalMs;
    return this.generateWithFallback(buildUserMessage(request), this.timeouts.textMs, deadline);
  }

  async generateFromAudio(request: AudioNotesRequest): Promise<GenerationResult> {
    const deadline = Date.now() + this.timeouts.totalMs;
    const file = await this.uploadAudio(request, deadline);
    try {
      const contents = createUserContent([
        createPartFromUri(file.uri ?? "", file.mimeType ?? request.mimeType),
        buildAudioMessage(request),
      ]);
      return await this.generateWithFallback(contents, this.timeouts.audioMs, deadline);
    } finally {
      // The recording is only needed for this one request; do not leave it on Google's servers.
      if (file.name) await this.client.files.delete({ name: file.name }).catch(() => {});
    }
  }

  /**
   * Tries each model in turn and returns the first good answer.
   * A model failing is logged for the operator and is invisible to the student;
   * an error is only reported when every model has failed.
   */
  private async generateWithFallback(
    contents: ContentListUnion,
    timeoutMs: number,
    deadline: number,
  ): Promise<GenerationResult> {
    let lastError: unknown;
    for (const model of this.modelsInOrder()) {
      const remaining = deadline - Date.now();
      if (remaining < this.timeouts.minAttemptMs) {
        console.info(`[notes] not enough time left to try ${model}`);
        break;
      }
      try {
        const result = await this.generateWith(model, contents, Math.min(timeoutMs, remaining));
        this.preferredModel = model;
        return result;
      } catch (err) {
        if (!(err instanceof GenerationError) || NEVER_RETRY.includes(err.code)) throw err;
        console.info(`[notes] ${model} did not answer (${err.code}), trying the next model`);
        lastError = err;
      }
    }
    throw lastError ?? new GenerationError("timeout");
  }

  private modelsInOrder(): string[] {
    const preferred = this.preferredModel;
    if (!preferred) return this.models;
    return [preferred, ...this.models.filter((model) => model !== preferred)];
  }

  private async generateWith(model: string, contents: ContentListUnion, timeoutMs: number): Promise<GenerationResult> {
    const response = await withTimeout(timeoutMs, (abortSignal) =>
      this.client.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
          responseJsonSchema: this.responseSchema,
          abortSignal,
        },
      }),
    );
    const finishReason = response.candidates?.[0]?.finishReason;

    if (response.promptFeedback?.blockReason || finishReason === FinishReason.SAFETY) {
      throw new GenerationError("declined");
    }
    if (finishReason === FinishReason.MAX_TOKENS) throw new GenerationError("too_long");

    return { pack: sanitizeStudyPack(parsePack(response.text)), demo: false };
  }

  /** Sends the recording to Google and waits until it is ready to be listened to. */
  private uploadAudio({ audio, mimeType }: AudioNotesRequest, deadline: number): Promise<GeminiFile> {
    return withTimeout(Math.min(this.timeouts.uploadMs, deadline - Date.now()), async (abortSignal) => {
      let file = await this.client.files.upload({ file: audio, config: { mimeType, abortSignal } });

      while (file.state === FileState.PROCESSING && file.name) {
        await sleep(this.timeouts.pollMs, abortSignal);
        file = await this.client.files.get({ name: file.name, config: { abortSignal } });
      }
      if (file.state === FileState.FAILED || !file.uri) throw new GenerationError("unavailable");
      return file;
    });
  }
}

/** Runs one call to Gemini with a time limit, and turns its failures into GenerationErrors. */
async function withTimeout<T>(timeoutMs: number, run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const signal = AbortSignal.timeout(timeoutMs);
  try {
    return await run(signal);
  } catch (err) {
    if (err instanceof GenerationError) throw err;
    if (signal.aborted) throw new GenerationError("timeout", { cause: err });
    if (err instanceof ApiError) throw new GenerationError(classifyApiError(err), { cause: err });
    throw err;
  }
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(signal.reason);
    });
  });
}

/** The model is asked for schema-valid JSON, but its answer is still untrusted input. */
function parsePack(text: string | undefined) {
  try {
    return StudyPackSchema.parse(JSON.parse(text ?? ""));
  } catch (err) {
    throw new GenerationError("unavailable", { cause: err });
  }
}

function classifyApiError(err: ApiError): GenerationErrorCode {
  if (err.status === 429) return "rate_limited";
  // Gemini reports a bad key as a 400, not a 401.
  if (err.status === 401 || err.status === 403 || /api key/i.test(err.message)) return "misconfigured";
  return "unavailable";
}
