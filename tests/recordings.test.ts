import { describe, expect, it } from "vitest";
import { isOwnRecordingPath, recordingPath } from "../lib/recordings";

const user = "8f14e45f-ceea-467f-a0e6-1b2c3d4e5f60";

describe("recording paths", () => {
  it("builds a path inside the student's own folder", () => {
    expect(recordingPath(user, "abc-123")).toBe(`${user}/abc-123.m4a`);
    expect(isOwnRecordingPath(user, recordingPath(user, "abc-123"))).toBe(true);
  });

  it("rejects another student's folder, nested paths and tricks", () => {
    const other = "11111111-2222-3333-4444-555555555555";
    for (const path of [
      `${other}/abc.m4a`,
      `${user}/sub/abc.m4a`,
      `${user}/../${other}/abc.m4a`,
      `${user}/abc`,
      `${user}/abc.exe`,
      `${user}/.m4a`,
      `/${user}/abc.m4a`,
      `${user}/a b.m4a`,
    ]) {
      expect(isOwnRecordingPath(user, path), path).toBe(false);
    }
  });
});
