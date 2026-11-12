import { NotesRequestSchema, type NotesResponse } from "@/lib/schema";
import { TRANSCRIPT_MAX_CHARS } from "@/lib/constants";
import { getStudyPackGenerator } from "@/lib/server/generatorFactory";
import { RateLimiter } from "@/lib/server/rateLimiter";
import { GenerationError, type GenerationErrorCode } from "@/lib/server/studyPackGenerator";

export const maxDuration = 300;

/** Each request costs real money, so cap how often one client can ask. */
const limiter = new RateLimiter(10, 10 * 60 * 1000);

/** JSON escaping can double the length; anything bigger is not a real request. */
const MAX_BODY_CHARS = TRANSCRIPT_MAX_CHARS * 2 + 1024;

const ERROR_RESPONSES: Record<GenerationErrorCode, { status: number; message: string }> = {
  declined: { status: 422, message: "The AI could not process this transcript." },
  too_long: { status: 422, message: "The class was too long to process in one go. Try a shorter recording." },
  rate_limited: { status: 503, message: "The AI service is busy right now. Wait a few minutes and try again." },
  misconfigured: { status: 500, message: "The server is not configured correctly." },
  timeout: { status: 504, message: "The AI service is busy right now. Wait a few minutes and try again." },
  unavailable: { status: 502, message: "The AI service is busy right now. Wait a few minutes and try again." },
};

function errorResponse(status: number, message: string, headers?: HeadersInit) {
  return Response.json({ error: message }, { status, headers });
}

function clientKey(req: Request): string {
  // Trust this header only behind a proxy that sets it (Vercel, nginx, ...).
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) {
    return errorResponse(415, "Send the transcript as JSON.");
  }

  const rate = limiter.check(clientKey(req));
  if (!rate.allowed) {
    return errorResponse(429, "You have made a lot of requests. Try again in a few minutes.", {
      "Retry-After": String(rate.retryAfterSeconds),
    });
  }

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

  try {
    const result = await getStudyPackGenerator().generate(parsed.data);
    return Response.json(result satisfies NotesResponse, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof GenerationError) {
      // Log the cause for the operator; the student only sees a safe message.
      console.error(`[notes] generation failed: ${err.code}`, err.cause ?? "");
      const { status, message } = ERROR_RESPONSES[err.code];
      return errorResponse(status, message);
    }
    console.error("[notes] unexpected error", err);
    return errorResponse(500, "Something went wrong. Try again.");
  }
}
