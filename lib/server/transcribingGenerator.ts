import "server-only";
import { buildTimeline, timelineToText } from "../transcript";
import type {
  AudioNotesRequest,
  AudioStudyPackGenerator,
  GenerationResult,
  StudyPackGenerator,
} from "./studyPackGenerator";
import type { NotesRequest } from "../schema";
import type { Transcriber } from "./transcriber";

/** Whether transcription is switched on right now (an admin can turn it off). */
export type TranscriptionSwitch = () => Promise<boolean>;

/** Speech-to-text is weak on Arabic and Moroccan Darija: the notes model listens to those itself. */
const LISTEN_DIRECTLY = new Set(["arabic", "ar"]);
/** Below this, the transcript is too thin to trust (silence, music, the wrong language). */
const MIN_TRANSCRIPT_CHARS = 200;

/**
 * Writes notes from a recording in two steps: a cheap speech-to-text service writes the transcript
 * (with the "I'm lost" markers placed at their times), then the notes model reads only text.
 * Whenever transcription is not a good fit or fails, the notes model listens to the audio as
 * before, so a student never gets an error because of this step.
 */
export class TranscribingStudyPackGenerator implements StudyPackGenerator, AudioStudyPackGenerator {
  constructor(
    private readonly transcriber: Transcriber,
    private readonly notes: StudyPackGenerator & AudioStudyPackGenerator,
    private readonly enabled: TranscriptionSwitch = async () => true,
  ) {}

  generate(request: NotesRequest): Promise<GenerationResult> {
    return this.notes.generate(request);
  }

  async generateFromAudio(request: AudioNotesRequest): Promise<GenerationResult> {
    const transcript = await this.tryTranscribe(request);
    if (!transcript) return this.notes.generateFromAudio(request);
    console.info(`[notes] writing from a ${transcript.length}-character transcript`);
    const result = await this.notes.generate({ transcript, language: request.language });
    return { ...result, path: "transcript" };
  }

  /** The transcript text with markers, or null when the audio should go to the notes model. */
  private async tryTranscribe(request: AudioNotesRequest): Promise<string | null> {
    if (!(await this.enabled().catch(() => true))) {
      console.info("[notes] transcription is switched off; the notes model will listen to the audio");
      return null;
    }
    if (request.audio.size > this.transcriber.maxBytes) {
      console.info("[notes] recording too large for transcription; the notes model will listen to it");
      return null;
    }
    try {
      const extension = request.mimeType.includes("webm") ? "webm" : request.mimeType.includes("mpeg") ? "mp3" : "m4a";
      const result = await this.transcriber.transcribe(request.audio, `class.${extension}`);
      if (LISTEN_DIRECTLY.has(result.language)) {
        console.info(`[notes] class detected as ${result.language}; the notes model will listen to it`);
        return null;
      }
      const text = timelineToText(buildTimeline(result.segments, request.lostTimes));
      const spoken = result.segments.reduce((n, s) => n + s.text.length, 0);
      if (spoken < MIN_TRANSCRIPT_CHARS) {
        console.info("[notes] transcript too short; the notes model will listen to the audio");
        return null;
      }
      return text;
    } catch (err) {
      console.warn("[notes] transcription failed; the notes model will listen to the audio", err);
      return null;
    }
  }
}
