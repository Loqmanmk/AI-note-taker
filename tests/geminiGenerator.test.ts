import { ApiError, FileState, FinishReason, type GoogleGenAI } from "@google/genai";
import { describe, expect, it } from "vitest";
import { GeminiStudyPackGenerator } from "../lib/server/geminiGenerator";
import { SAMPLE_PACK } from "../lib/sample";

const request = { transcript: "The teacher explained photosynthesis in detail today.", language: "auto" as const };

type Call = { model: string; config: Record<string, unknown> };

/** A stand-in for the Gemini client that returns (or throws) what the test decides. */
function fakeClient(reply: () => unknown) {
  const calls: Call[] = [];
  const client = {
    models: {
      generateContent: async (params: Call) => {
        calls.push(params);
        return reply();
      },
    },
  } as unknown as GoogleGenAI;
  return { client, calls };
}

const okReply = { text: JSON.stringify(SAMPLE_PACK), candidates: [{ finishReason: FinishReason.STOP }] };

describe("GeminiStudyPackGenerator", () => {
  it("returns the parsed study pack and asks for schema-constrained JSON", async () => {
    const { client, calls } = fakeClient(() => okReply);
    const result = await new GeminiStudyPackGenerator(client, ["test-model"]).generate(request);

    expect(result).toEqual({ pack: SAMPLE_PACK, demo: false });
    expect(calls[0].model).toBe("test-model");
    expect(calls[0].config.responseMimeType).toBe("application/json");
    const schema = calls[0].config.responseJsonSchema as Record<string, unknown>;
    expect(schema.type).toBe("object");
    expect(schema).not.toHaveProperty("$schema");
  });

  it.each([
    ["a blocked prompt", { promptFeedback: { blockReason: "SAFETY" } }, "declined"],
    ["a safety stop", { candidates: [{ finishReason: FinishReason.SAFETY }] }, "declined"],
    ["a cut-off answer", { text: "{", candidates: [{ finishReason: FinishReason.MAX_TOKENS }] }, "too_long"],
    ["invalid JSON", { text: "not json", candidates: [{ finishReason: FinishReason.STOP }] }, "unavailable"],
    ["JSON of the wrong shape", { text: '{"title":1}', candidates: [{ finishReason: FinishReason.STOP }] }, "unavailable"],
  ])("reports %s as %s", async (_name, reply, code) => {
    const { client } = fakeClient(() => reply);
    await expect(new GeminiStudyPackGenerator(client, ["test-model"]).generate(request)).rejects.toMatchObject({ code });
  });

  it.each([
    [429, "quota exceeded", "rate_limited"],
    [400, "API key not valid. Please pass a valid API key.", "misconfigured"],
    [403, "permission denied", "misconfigured"],
    [503, "overloaded", "unavailable"],
  ])("maps API error %i to %s", async (status, message, code) => {
    const { client } = fakeClient(() => {
      throw new ApiError({ status, message });
    });
    await expect(new GeminiStudyPackGenerator(client, ["test-model"]).generate(request)).rejects.toMatchObject({ code });
  });

  it("gives up with a timeout error when the AI does not answer", async () => {
    const client = {
      models: {
        generateContent: ({ config }: { config: { abortSignal: AbortSignal } }) =>
          new Promise((_resolve, reject) => {
            config.abortSignal.addEventListener("abort", () => reject(config.abortSignal.reason));
          }),
      },
    } as unknown as GoogleGenAI;

    const generator = new GeminiStudyPackGenerator(client, ["test-model"], { textMs: 20 });
    await expect(generator.generate(request)).rejects.toMatchObject({ code: "timeout" });
  });

  it("falls back to the next model when one is overloaded", async () => {
    let attempt = 0;
    const { client, calls } = fakeClient(() => {
      if (attempt++ === 0) throw new ApiError({ status: 503, message: "high demand" });
      return okReply;
    });

    const result = await new GeminiStudyPackGenerator(client, ["busy-model", "free-model"]).generate(request);

    expect(result.pack).toEqual(SAMPLE_PACK);
    expect(calls.map((c) => c.model)).toEqual(["busy-model", "free-model"]);
  });

  it("does not try other models when the key is wrong", async () => {
    const { client, calls } = fakeClient(() => {
      throw new ApiError({ status: 400, message: "API key not valid." });
    });

    const generator = new GeminiStudyPackGenerator(client, ["a", "b"]);
    await expect(generator.generate(request)).rejects.toMatchObject({ code: "misconfigured" });
    expect(calls).toHaveLength(1);
  });

  it("starts with the model that worked last time", async () => {
    const { client, calls } = fakeClient(() => {
      if (calls.at(-1)?.model === "busy-model") throw new ApiError({ status: 503, message: "high demand" });
      return okReply;
    });
    const generator = new GeminiStudyPackGenerator(client, ["busy-model", "free-model"]);

    await generator.generate(request);
    await generator.generate(request);

    expect(calls.map((c) => c.model)).toEqual(["busy-model", "free-model", "free-model"]);
  });

  it("moves on when a model returns a broken answer", async () => {
    let attempt = 0;
    const { client } = fakeClient(() =>
      attempt++ === 0 ? { text: "not json", candidates: [{ finishReason: FinishReason.STOP }] } : okReply,
    );

    const result = await new GeminiStudyPackGenerator(client, ["a", "b"]).generate(request);
    expect(result.pack).toEqual(SAMPLE_PACK);
  });
});

describe("GeminiStudyPackGenerator time budget", () => {
  it("stops trying models when the time left is too short, so the platform does not cut the request", async () => {
    const calls: string[] = [];
    const client = {
      models: {
        generateContent: ({ model, config }: { model: string; config: { abortSignal: AbortSignal } }) => {
          calls.push(model);
          return new Promise((_resolve, reject) => {
            config.abortSignal.addEventListener("abort", () => reject(config.abortSignal.reason));
          });
        },
      },
    } as unknown as GoogleGenAI;

    const generator = new GeminiStudyPackGenerator(client, ["a", "b", "c"], {
      textMs: 60,
      totalMs: 150,
      minAttemptMs: 50,
    });
    await expect(generator.generate(request)).rejects.toMatchObject({ code: "timeout" });
    expect(calls).toEqual(["a", "b"]);
  });
});

describe("GeminiStudyPackGenerator with a recording", () => {
  const audioRequest = {
    audio: new Blob(["fake audio bytes"]),
    mimeType: "audio/mp4",
    language: "auto" as const,
    lostTimes: [42],
  };

  /** A stand-in client that records which file operations happen, in order. */
  function fakeAudioClient(options: { processingChecks?: number; generate?: () => unknown } = {}) {
    const log: string[] = [];
    let checksLeft = options.processingChecks ?? 0;
    const file = { name: "files/abc", uri: "https://example.test/files/abc", mimeType: "audio/mp4" };
    const client = {
      files: {
        upload: async () => {
          log.push("upload");
          return { ...file, state: checksLeft > 0 ? FileState.PROCESSING : FileState.ACTIVE };
        },
        get: async () => {
          log.push("get");
          return { ...file, state: --checksLeft > 0 ? FileState.PROCESSING : FileState.ACTIVE };
        },
        delete: async () => {
          log.push("delete");
        },
      },
      models: {
        generateContent: async (params: { contents: unknown }) => {
          log.push("generate");
          expect(JSON.stringify(params.contents)).toContain(file.uri);
          expect(JSON.stringify(params.contents)).toContain("marker #1 at 00:42");
          return (options.generate ?? (() => okReply))();
        },
      },
    } as unknown as GoogleGenAI;
    return { client, log };
  }

  it("uploads the recording, writes the notes, then deletes the recording", async () => {
    const { client, log } = fakeAudioClient();
    const result = await new GeminiStudyPackGenerator(client, ["m"]).generateFromAudio(audioRequest);

    expect(result.pack).toEqual(SAMPLE_PACK);
    expect(log).toEqual(["upload", "generate", "delete"]);
  });

  it("waits while the recording is being processed", async () => {
    const { client, log } = fakeAudioClient({ processingChecks: 2 });
    await new GeminiStudyPackGenerator(client, ["m"], { pollMs: 1 }).generateFromAudio(audioRequest);

    expect(log).toEqual(["upload", "get", "get", "generate", "delete"]);
  });

  it("deletes the recording even when every model fails", async () => {
    const { client, log } = fakeAudioClient({
      generate: () => {
        throw new ApiError({ status: 503, message: "high demand" });
      },
    });
    const generator = new GeminiStudyPackGenerator(client, ["a", "b"]);

    await expect(generator.generateFromAudio(audioRequest)).rejects.toMatchObject({ code: "unavailable" });
    expect(log).toEqual(["upload", "generate", "generate", "delete"]);
  });
});
