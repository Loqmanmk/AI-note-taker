import { describe, expect, it } from "vitest";
import { resolveAudioMimeType } from "../lib/audio";

describe("resolveAudioMimeType", () => {
  it("uses a known declared type, ignoring parameters and case", () => {
    expect(resolveAudioMimeType("audio/x-m4a", "x")).toBe("audio/mp4");
    expect(resolveAudioMimeType("Audio/WebM; codecs=opus", "x")).toBe("audio/webm");
  });

  it("falls back to the extension when the phone declares nothing useful", () => {
    expect(resolveAudioMimeType("", "recording-1234.m4a")).toBe("audio/mp4");
    expect(resolveAudioMimeType("application/octet-stream", "class.M4A")).toBe("audio/mp4");
    expect(resolveAudioMimeType("video/mp4", "class.m4a")).toBe("audio/mp4");
  });

  it("rejects files that are neither", () => {
    expect(resolveAudioMimeType("application/pdf", "notes.pdf")).toBeUndefined();
    expect(resolveAudioMimeType("", "m4a")).toBeUndefined();
  });
});
