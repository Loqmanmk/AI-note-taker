import { describe, expect, it } from "vitest";
import { SAMPLE_PACK } from "../lib/sample";
import type { AudioNotesRequest, GenerationResult } from "../lib/server/studyPackGenerator";
import type { NotesRequest } from "../lib/schema";
import { TranscriptionUnavailableError, type Transcriber, type Transcript } from "../lib/server/transcriber";
import { TranscribingStudyPackGenerator } from "../lib/server/transcribingGenerator";

const LONG = "La photosynthèse transforme l'énergie lumineuse en énergie chimique dans les chloroplastes. ".repeat(4);

function notesModel() {
  const calls: { kind: "text" | "audio"; request: NotesRequest | AudioNotesRequest }[] = [];
  const result: GenerationResult = { pack: SAMPLE_PACK, demo: false };
  return {
    calls,
    generator: {
      generate: async (request: NotesRequest) => (calls.push({ kind: "text", request }), result),
      generateFromAudio: async (request: AudioNotesRequest) => (calls.push({ kind: "audio", request }), result),
    },
  };
}

function transcriber(answer: () => Transcript, maxBytes = 1000): Transcriber {
  return { maxBytes, transcribe: async () => answer() };
}

const audio = (bytes = 100): AudioNotesRequest => ({
  audio: new Blob([new Uint8Array(bytes)]),
  mimeType: "audio/mp4",
  language: "auto",
  lostTimes: [65],
});

describe("transcribe first, then write notes from text", () => {
  it("sends Gemini the transcript with the I'm lost marker at its time", async () => {
    const model = notesModel();
    const gen = new TranscribingStudyPackGenerator(
      transcriber(() => ({ language: "french", segments: [{ t: 10, text: LONG }, { t: 70, text: "Ensuite le cycle de Calvin." }] })),
      model.generator,
    );
    await gen.generateFromAudio(audio());
    expect(model.calls.map((c) => c.kind)).toEqual(["text"]);
    const transcript = (model.calls[0].request as NotesRequest).transcript;
    expect(transcript).toContain("[00:10] La photosynthèse");
    expect(transcript.indexOf("I'M LOST")).toBeGreaterThan(transcript.indexOf("[00:10]"));
    expect(transcript.indexOf("I'M LOST")).toBeLessThan(transcript.indexOf("[01:10]"));
  });

  it("lets Gemini listen to Arabic and Darija classes", async () => {
    const model = notesModel();
    const gen = new TranscribingStudyPackGenerator(transcriber(() => ({ language: "arabic", segments: [{ t: 0, text: LONG }] })), model.generator);
    await gen.generateFromAudio(audio());
    expect(model.calls.map((c) => c.kind)).toEqual(["audio"]);
  });

  it("lets Gemini listen when the file is too big, the service fails, or the transcript is empty", async () => {
    for (const [t, bytes] of [
      [transcriber(() => ({ language: "french", segments: [{ t: 0, text: LONG }] }), 50), 100],
      [transcriber(() => { throw new TranscriptionUnavailableError("429"); }), 100],
      [transcriber(() => ({ language: "english", segments: [{ t: 0, text: "Music." }] })), 100],
    ] as const) {
      const model = notesModel();
      await new TranscribingStudyPackGenerator(t, model.generator).generateFromAudio(audio(bytes));
      expect(model.calls.map((c) => c.kind)).toEqual(["audio"]);
    }
  });
});
