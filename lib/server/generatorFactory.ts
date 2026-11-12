import "server-only";
import { ClaudeStudyPackGenerator } from "./claudeGenerator";
import { DemoStudyPackGenerator } from "./demoGenerator";
import { GeminiStudyPackGenerator } from "./geminiGenerator";
import type { StudyPackGenerator } from "./studyPackGenerator";

let generator: StudyPackGenerator | undefined;

function createGenerator(): StudyPackGenerator {
  if (process.env.GEMINI_API_KEY) return new GeminiStudyPackGenerator();
  if (process.env.ANTHROPIC_API_KEY) return new ClaudeStudyPackGenerator();
  return new DemoStudyPackGenerator();
}

/** Picks the generator once per server process, based on which API key is configured. */
export function getStudyPackGenerator(): StudyPackGenerator {
  generator ??= createGenerator();
  return generator;
}
