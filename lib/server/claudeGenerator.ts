import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { StudyPackSchema, sanitizeStudyPack, type NotesRequest } from "../schema";
import { SYSTEM_PROMPT, buildUserMessage } from "./prompt";
import {
  GENERATION_TIMEOUT_MS,
  GenerationError,
  type GenerationResult,
  type StudyPackGenerator,
} from "./studyPackGenerator";

const MODEL = "claude-opus-5-5";

export class ClaudeStudyPackGenerator implements StudyPackGenerator {
  constructor(private readonly client: Anthropic = new Anthropic({ timeout: GENERATION_TIMEOUT_MS, maxRetries: 0 })) {}

  async generate(request: NotesRequest): Promise<GenerationResult> {
    const response = await this.callModel(request);

    if (response.stop_reason === "refusal") throw new GenerationError("declined");
    if (response.stop_reason === "max_tokens" || !response.parsed_output) {
      throw new GenerationError("too_long");
    }
    return { pack: sanitizeStudyPack(response.parsed_output), demo: false };
  }

  private async callModel(request: NotesRequest) {
    try {
      return await this.client.beta.messages.parse({
        model: MODEL,
        max_tokens: 16000,
        thinking: { type: "adaptive" },
        // If the model declines on safety grounds, the API retries on a backup model.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildUserMessage(request) }],
        output_config: { effort: "medium", format: betaZodOutputFormat(StudyPackSchema) },
      });
    } catch (err) {
      if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
        throw new GenerationError("misconfigured", { cause: err });
      }
      if (err instanceof Anthropic.RateLimitError) {
        throw new GenerationError("rate_limited", { cause: err });
      }
      if (err instanceof Anthropic.APIConnectionTimeoutError) {
        throw new GenerationError("timeout", { cause: err });
      }
      if (err instanceof Anthropic.APIError) {
        throw new GenerationError("unavailable", { cause: err });
      }
      throw err;
    }
  }
}
