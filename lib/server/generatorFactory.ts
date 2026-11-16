import "server-only";
import { ClaudeStudyPackGenerator } from "./claudeGenerator";
import { DemoStudyPackGenerator } from "./demoGenerator";
import { GeminiStudyPackGenerator } from "./geminiGenerator";
import type { StudyPackGenerator } from "./studyPackGenerator";
import { GroqWhisperTranscriber } from "./transcriber";
import { TranscribingStudyPackGenerator } from "./transcribingGenerator";

let generator: StudyPackGenerator | undefined;

function createGenerator(): StudyPackGenerator {
  if (process.env.GEMINI_API_KEY) {
    const gemini = new GeminiStudyPackGenerator();
    // With a Groq key, recordings are transcribed first and Gemini only reads text (much cheaper).
    const groqKey = process.env.GROQ_API_KEY?.trim();
    const maxMb = Number(process.env.GROQ_MAX_FILE_MB) || 25;
    return groqKey ? new TranscribingStudyPackGenerator(new GroqWhisperTranscriber(groqKey, maxMb * 1024 * 1024), gemini) : gemini;
  }
  if (process.env.ANTHROPIC_API_KEY) return new ClaudeStudyPackGenerator();
  return new DemoStudyPackGenerator();
}

/** Picks the generator once per server process, based on which API key is configured. */
export function getStudyPackGenerator(): StudyPackGenerator {
  generator ??= createGenerator();
  return generator;
}
