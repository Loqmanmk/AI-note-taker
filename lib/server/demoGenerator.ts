import { SAMPLE_PACK } from "../sample";
import type { GenerationResult, StudyPackGenerator } from "./studyPackGenerator";

/** Used when no AI key is configured, so the interface can still be tried. */
export class DemoStudyPackGenerator implements StudyPackGenerator {
  async generate(): Promise<GenerationResult> {
    return { pack: SAMPLE_PACK, demo: true };
  }
}
