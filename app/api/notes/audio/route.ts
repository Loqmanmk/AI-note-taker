import { resolveAudioMimeType } from "@/lib/audio";
import { AUDIO_MAX_BYTES, AUDIO_MIN_BYTES } from "@/lib/constants";
import { RECORDING_BYTES_PER_SECOND } from "@/lib/plans";
import { isOwnRecordingPath } from "@/lib/recordings";
import { AudioNotesFieldsSchema, StoredRecordingRequestSchema } from "@/lib/schema";
import { getAccounts } from "@/lib/server/accounts";
import type { AuthUser } from "@/lib/server/auth";
import type { NotesJobResponse } from "@/lib/schema";
import { getStudyPackGenerator } from "@/lib/server/generatorFactory";
import { after } from "next/server";
import {
  admitRequest,
  errorResponse,
  generationFailureMessage,
  generationResponse,
  planLimitResponse,
  recordUsage,
} from "@/lib/server/http";
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
 *   With "background": true, answers 202 { classId, status: "processing" } at once and writes the
 *   notes in the background: the class turns "ready" or "failed" in the student's account.
 *   Without it (older app versions), answers with the notes, as before.
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
  const { recordings, repository } = getAccounts();
  if (!user || !recordings || !repository) return errorResponse(400, "Sign in to send recordings this way.");

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

  const { recordingPath, background, ...fields } = parsed.data;
  if (!isOwnRecordingPath(user.id, recordingPath)) return errorResponse(400, "Invalid recording.");

  // A recording is only kept until its notes are written, whatever the outcome.
  const removeRecording = () =>
    recordings.remove(user, recordingPath).catch((err: unknown) => {
      console.error("[notes] could not delete the recording", err);
    });

  const audio = await recordings.download(user, recordingPath);
  const refusal = !audio
    ? errorResponse(404, "The recording could not be found. Record the class again.")
    : audio.size > AUDIO_MAX_BYTES
      ? errorResponse(413, TOO_LONG)
      : audio.size < AUDIO_MIN_BYTES
        ? errorResponse(400, "The recording is too short to make notes from.")
        : null;
  const mimeType = resolveAudioMimeType(audio?.type ?? "", recordingPath);
  if (refusal || !audio || !mimeType) {
    await removeRecording();
    return refusal ?? errorResponse(415, "This audio format is not supported.");
  }

  // Estimated from the size, which the phone cannot fake, rather than a length it reports.
  const recordingSeconds = audio.size / RECORDING_BYTES_PER_SECOND;
  const overLimit = await planLimitResponse(user, recordingSeconds);
  if (overLimit) {
    await removeRecording();
    return overLimit;
  }

  if (!background) {
    // Older app versions wait for the notes in the answer.
    try {
      return await generationResponse(
        user,
        () => generator.generateFromAudio({ ...fields, audio, mimeType }),
        recordingSeconds,
      );
    } finally {
      await removeRecording();
    }
  }

  let classId: string;
  try {
    classId = await repository.createProcessing(user);
  } catch (err) {
    console.error("[notes] could not create the class", err);
    await removeRecording();
    return errorResponse(500, "Could not save the class. Try again.");
  }

  // Answer now; the student can leave the app while the notes are written.
  after(async () => {
    try {
      const result = await generator.generateFromAudio({ ...fields, audio, mimeType });
      await repository.complete(user, classId, result.pack);
      await recordUsage(user, recordingSeconds);
    } catch (err) {
      console.error(`[notes] background job ${classId} failed`, err);
      await repository.fail(user, classId, generationFailureMessage(err)).catch((failErr: unknown) => {
        console.error("[notes] could not mark the class as failed", failErr);
      });
    } finally {
      await removeRecording();
    }
  });

  const body: NotesJobResponse = { classId, status: "processing" };
  return Response.json(body, { status: 202, headers: { "Cache-Control": "no-store" } });
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
