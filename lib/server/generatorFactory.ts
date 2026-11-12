import "server-only";
import { ClaudeStudyPackGenerator } from "./claudeGenerator";
import { DemoStudyPackGenerator } from "./demoGenerator";
import type { StudyPackGenerator } from "./studyPackGenerator";

let generator: StudyPackGenerator | undefined;

/** Picks the generator once per server process, based on configuration. */
export function getStudyPackGenerator(): StudyPackGenerator {
  generator ??= process.env.ANTHROPIC_API_KEY ? new ClaudeStudyPackGenerator() : new DemoStudyPackGenerator();
  return generator;
}
