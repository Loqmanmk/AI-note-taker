import "server-only";
import type { Segment } from "../transcript";

/** What a speech-to-text service heard: the detected language and timed sentences. */
export type Transcript = {
  /** Lower-case language name or code as the service reports it, for example "french" or "fr". */
  language: string;
  segments: Segment[];
};

/** Turns a recording into timed text. */
export interface Transcriber {
  /** The largest file the service accepts, in bytes. */
  readonly maxBytes: number;
  transcribe(audio: Blob, fileName: string): Promise<Transcript>;
}

/** The service said no (quota, size, outage); the caller should use another way. */
export class TranscriptionUnavailableError extends Error {}

const GROQ_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const TIMEOUT_MS = 120_000;

/**
 * Groq's hosted Whisper (whisper-large-v3-turbo by default). Free up to a daily amount of audio,
 * then billed per hour of audio, much cheaper than having the notes model listen to the audio.
 */
export class GroqWhisperTranscriber implements Transcriber {
  constructor(
    private readonly apiKey: string,
    readonly maxBytes: number = 25 * 1024 * 1024,
    private readonly model: string = "whisper-large-v3-turbo",
  ) {}

  async transcribe(audio: Blob, fileName: string): Promise<Transcript> {
    const form = new FormData();
    form.append("file", audio, fileName);
    form.append("model", this.model);
    form.append("response_format", "verbose_json");
    form.append("timestamp_granularities[]", "segment");
    form.append("temperature", "0");

    let res: Response;
    try {
      res = await fetch(GROQ_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}` },
        body: form,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      throw new TranscriptionUnavailableError("Could not reach Groq", { cause: err });
    }
    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 300);
      throw new TranscriptionUnavailableError(`Groq answered ${res.status}: ${detail}`);
    }
    const body = (await res.json()) as {
      language?: string;
      segments?: { start?: number; text?: string }[];
      text?: string;
    };
    const segments: Segment[] = (body.segments ?? [])
      .map((s) => ({ t: Number(s.start ?? 0), text: (s.text ?? "").trim() }))
      .filter((s) => s.text !== "");
    if (segments.length === 0 && body.text?.trim()) segments.push({ t: 0, text: body.text.trim() });
    return { language: (body.language ?? "").toLowerCase(), segments };
  }
}
