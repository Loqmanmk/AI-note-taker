import { resolveAudioMimeType } from "@/lib/audio";
import { AUDIO_MAX_BYTES, AUDIO_MIN_BYTES } from "@/lib/constants";
import { AudioNotesFieldsSchema } from "@/lib/schema";
import { getStudyPackGenerator } from "@/lib/server/generatorFactory";
import { errorResponse, generationResponse, rateLimitResponse } from "@/lib/server/http";
import { supportsAudio } from "@/lib/server/studyPackGenerator";

export const maxDuration = 300;

/** Room for the form fields and multipart boundaries around the audio. */
const MAX_BODY_BYTES = AUDIO_MAX_BYTES + 64 * 1024;

function parseJsonField(value: FormDataEntryValue | null): unknown {
  if (typeof value !== "string" || value === "") return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return null; // Not undefined, so validation rejects it instead of applying the default.
  }
}

/**
 * Creates a study pack from a recording of a class.
 * Expects multipart form data: "audio" (the file), "language", and "lostTimes" (JSON array of seconds).
 */
export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("multipart/form-data")) {
    return errorResponse(415, "Send the recording as multipart form data.");
  }
  // Refuse oversized uploads before reading them into memory.
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return errorResponse(413, "The recording is too long. Split the class into two parts.");
  }

  const limited = rateLimitResponse(req);
  if (limited) return limited;

  const generator = getStudyPackGenerator();
  if (!supportsAudio(generator)) {
    return errorResponse(501, "Recordings are not supported with the current AI provider.");
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return errorResponse(400, "The upload could not be read.");
  }

  const audio = form.get("audio");
  if (!(audio instanceof File)) return errorResponse(400, "The recording is missing.");
  if (audio.size > AUDIO_MAX_BYTES) {
    return errorResponse(413, "The recording is too long. Split the class into two parts.");
  }
  if (audio.size < AUDIO_MIN_BYTES) return errorResponse(400, "The recording is too short to make notes from.");

  // The type is declared by the client; the AI service rejects files that are not really audio.
  const mimeType = resolveAudioMimeType(audio.type, audio.name);
  if (!mimeType) return errorResponse(415, "This audio format is not supported.");

  const fields = AudioNotesFieldsSchema.safeParse({
    language: form.get("language") || undefined,
    lostTimes: parseJsonField(form.get("lostTimes")),
  });
  if (!fields.success) {
    return errorResponse(400, fields.error.issues[0]?.message ?? "Invalid request.");
  }

  return generationResponse(() => generator.generateFromAudio({ ...fields.data, audio, mimeType }));
}
