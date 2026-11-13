import { resolveAudioMimeType } from "@/lib/audio";
import { AUDIO_MAX_BYTES, AUDIO_MIN_BYTES } from "@/lib/constants";
import { isOwnRecordingPath } from "@/lib/recordings";
import { AudioNotesFieldsSchema, StoredRecordingRequestSchema } from "@/lib/schema";
import { getAccounts } from "@/lib/server/accounts";
import type { AuthUser } from "@/lib/server/auth";
import { getStudyPackGenerator } from "@/lib/server/generatorFactory";
import { admitRequest, errorResponse, generationResponse } from "@/lib/server/http";
import { supportsAudio, type AudioStudyPackGenerator } from "@/lib/server/studyPackGenerator";

/** The longest a Vercel function may run on the free plan. The generator keeps within it. */
export const maxDuration = 300;

/** Room for the form fields and multipart boundaries around the audio. */
const MAX_UPLOAD_BODY_BYTES = AUDIO_MAX_BYTES + 64 * 1024;
const MAX_JSON_BODY_CHARS = 10_000;
const TOO_LONG = "The recording is too long. Split the class into two parts.";

/**
 * Creates a study pack from a recording of a class, sent in one of two ways:
 * - JSON { recordingPath, language, lostTimes }: the phone already uploaded the recording to
 *   storage. Used with accounts, because hosting platforms cap request size (Vercel: 4.5 MB).
 * - Multipart form data with "audio", "language" and "lostTimes": the recording itself. Used
 *   when accounts are off, typically on a local computer.
 */
export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";
  const isStored = contentType.includes("application/json");
  if (!isStored && !contentType.includes("multipart/form-data")) {
    return errorResponse(415, "Send the recording as JSON or multipart form data.");
  }
  // Refuse oversized bodies before reading them into memory.
  const declaredLength = Number(req.headers.get("content-length") ?? 0);
  if (declaredLength > (isStored ? MAX_JSON_BODY_CHARS : MAX_UPLOAD_BODY_BYTES)) {
    return errorResponse(413, isStored ? "The request is too large." : TOO_LONG);
  }

  const admitted = await admitRequest(req);
  if (admitted instanceof Response) return admitted;

  const generator = getStudyPackGenerator();
  if (!supportsAudio(generator)) {
    return errorResponse(501, "Recordings are not supported with the current AI provider.");
  }

  return isStored ? fromStorage(req, admitted.user, generator) : fromUpload(req, admitted.user, generator);
}

async function fromStorage(req: Request, user: AuthUser | null, generator: AudioStudyPackGenerator) {
  const recordings = getAccounts().recordings;
  if (!user || !recordings) return errorResponse(400, "Sign in to send recordings this way.");

  const raw = await req.text();
  if (raw.length > MAX_JSON_BODY_CHARS) return errorResponse(413, "The request is too large.");
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return errorResponse(400, "The request was not valid JSON.");
  }
  const parsed = StoredRecordingRequestSchema.safeParse(json);
  if (!parsed.success) return errorResponse(400, parsed.error.issues[0]?.message ?? "Invalid request.");

  const { recordingPath, ...fields } = parsed.data;
  if (!isOwnRecordingPath(user.id, recordingPath)) return errorResponse(400, "Invalid recording.");

  try {
    const audio = await recordings.download(user, recordingPath);
    if (!audio) return errorResponse(404, "The recording could not be found. Record the class again.");
    if (audio.size > AUDIO_MAX_BYTES) return errorResponse(413, TOO_LONG);
    if (audio.size < AUDIO_MIN_BYTES) return errorResponse(400, "The recording is too short to make notes from.");

    const mimeType = resolveAudioMimeType(audio.type, recordingPath);
    if (!mimeType) return errorResponse(415, "This audio format is not supported.");

    return await generationResponse(user, () => generator.generateFromAudio({ ...fields, audio, mimeType }));
  } finally {
    // A recording is only kept until its notes are written, whatever the outcome.
    await recordings.remove(user, recordingPath).catch((err: unknown) => {
      console.error("[notes] could not delete the recording", err);
    });
  }
}

function parseJsonField(value: FormDataEntryValue | null): unknown {
  if (typeof value !== "string" || value === "") return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return null; // Not undefined, so validation rejects it instead of applying the default.
  }
}

async function fromUpload(req: Request, user: AuthUser | null, generator: AudioStudyPackGenerator) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return errorResponse(400, "The upload could not be read.");
  }

  const audio = form.get("audio");
  if (!(audio instanceof File)) return errorResponse(400, "The recording is missing.");
  if (audio.size > AUDIO_MAX_BYTES) return errorResponse(413, TOO_LONG);
  if (audio.size < AUDIO_MIN_BYTES) return errorResponse(400, "The recording is too short to make notes from.");

  // The type is declared by the client; the AI service rejects files that are not really audio.
  const mimeType = resolveAudioMimeType(audio.type, audio.name);
  if (!mimeType) return errorResponse(415, "This audio format is not supported.");

  const fields = AudioNotesFieldsSchema.safeParse({
    language: form.get("language") || undefined,
    lostTimes: parseJsonField(form.get("lostTimes")),
  });
  if (!fields.success) return errorResponse(400, fields.error.issues[0]?.message ?? "Invalid request.");

  return generationResponse(user, () => generator.generateFromAudio({ ...fields.data, audio, mimeType }));
}
