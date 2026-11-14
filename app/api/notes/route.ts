import { TRANSCRIPT_MAX_CHARS } from "@/lib/constants";
import { NotesRequestSchema } from "@/lib/schema";
import { getStudyPackGenerator } from "@/lib/server/generatorFactory";
import { admitRequest, errorResponse, generationResponse, planLimitResponse } from "@/lib/server/http";
import { requestLanguage } from "@/lib/server/messages";

export const maxDuration = 300;

/** JSON escaping can double the length; anything bigger is not a real request. */
const MAX_BODY_CHARS = TRANSCRIPT_MAX_CHARS * 2 + 1024;

/** Creates a study pack from the text of a class. */
export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) {
    return errorResponse(415, "Send the transcript as JSON.");
  }

  const admitted = await admitRequest(req);
  if (admitted instanceof Response) return admitted;

  const raw = await req.text();
  if (raw.length > MAX_BODY_CHARS) return errorResponse(413, "The transcript is too long.");

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return errorResponse(400, "The request was not valid JSON.");
  }

  const parsed = NotesRequestSchema.safeParse(json);
  if (!parsed.success) {
    return errorResponse(400, parsed.error.issues[0]?.message ?? "Invalid request.");
  }

  const language = requestLanguage(req);
  const overLimit = await planLimitResponse(admitted.user, 0, language);
  if (overLimit) return overLimit;

  return generationResponse(admitted.user, () => getStudyPackGenerator().generate(parsed.data), 0, language);
}
