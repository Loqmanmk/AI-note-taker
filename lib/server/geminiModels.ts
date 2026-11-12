import type { GoogleGenAI } from "@google/genai";

/** Used only if Google's model list cannot be read. */
const FALLBACK_MODELS = ["gemini-3.8-flash", "gemini-3.5-flash"];

/** Flash models that produce images, audio or live streams cannot write a study pack. */
const NOT_TEXT_MODELS = /image|tts|audio|live|embedding|omni|robotics|computer-use/;

const CATALOG_TTL_MS = 60 * 60 * 1000;
const LIST_TIMEOUT_MS = 10_000;

function version(name: string): number {
  return Number(name.match(/^gemini-(\d+(?:\.\d+)?)/)?.[1] ?? 0);
}

/**
 * Picks the text "flash" models (the family with a free tier) and orders them
 * newest first, with the full model before its lighter "lite" variant.
 */
export function rankTextFlashModels(names: string[]): string[] {
  return [...new Set(names)]
    .filter((name) => name.startsWith("gemini-") && name.includes("flash") && !NOT_TEXT_MODELS.test(name))
    .sort((a, b) => version(b) - version(a) || Number(a.includes("lite")) - Number(b.includes("lite")));
}

/** Models named in GEMINI_MODEL (comma separated), if the operator wants to choose them. */
export function modelsFromEnv(value = process.env.GEMINI_MODEL): string[] {
  return (value ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
}

/**
 * The models to try, in order. Asks Google which models this key can use, so
 * the list stays correct as models are released and retired.
 */
export class GeminiModelCatalog {
  private cached: { models: string[]; at: number } | null = null;
  /** Models Google said do not exist for this key. Never tried again. */
  private readonly retired = new Set<string>();

  constructor(
    private readonly client: GoogleGenAI,
    private readonly pinned: string[] = modelsFromEnv(),
    private readonly now: () => number = Date.now,
  ) {}

  async candidates(): Promise<string[]> {
    const models = this.pinned.length ? this.pinned : await this.discover();
    return models.filter((model) => !this.retired.has(model));
  }

  markRetired(model: string) {
    this.retired.add(model);
  }

  private async discover(): Promise<string[]> {
    if (this.cached && this.now() - this.cached.at < CATALOG_TTL_MS) return this.cached.models;

    try {
      const names: string[] = [];
      const pager = await this.client.models.list({
        config: { pageSize: 200, abortSignal: AbortSignal.timeout(LIST_TIMEOUT_MS) },
      });
      for await (const model of pager) {
        const usable = !model.supportedActions || model.supportedActions.includes("generateContent");
        if (model.name && usable) names.push(model.name.replace(/^models\//, ""));
      }
      const ranked = rankTextFlashModels(names);
      if (ranked.length === 0) return FALLBACK_MODELS;
      this.cached = { models: ranked, at: this.now() };
      return ranked;
    } catch (err) {
      console.warn("[notes] could not list Gemini models, using the built-in list", err);
      return FALLBACK_MODELS;
    }
  }
}
