import type { NotesResponse } from "../schema";
import { RateLimiter } from "./rateLimiter";
import { GenerationError, type GenerationErrorCode, type GenerationResult } from "./studyPackGenerator";

/** Every AI request has a cost, so cap how often one client can ask. Shared by all notes routes. */
const limiter = new RateLimiter(10, 10 * 60 * 1000);

const BUSY = "The AI service is busy right now. Wait a few minutes and try again.";

const ERROR_RESPONSES: Record<GenerationErrorCode, { status: number; message: string }> = {
  declined: { status: 422, message: "The AI could not process this class." },
  too_long: { status: 422, message: "The class was too long to process in one go. Try a shorter recording." },
  misconfigured: { status: 500, message: "The server is not configured correctly." },
  rate_limited: { status: 503, message: BUSY },
  timeout: { status: 504, message: BUSY },
  unavailable: { status: 502, message: BUSY },
};

export function errorResponse(status: number, message: string, headers?: HeadersInit) {
  return Response.json({ error: message }, { status, headers });
}

function clientKey(req: Request): string {
  // Trust this header only behind a proxy that sets it (Vercel, nginx, ...).
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

/** Returns a 429 response when the client has asked too often, otherwise nothing. */
export function rateLimitResponse(req: Request): Response | undefined {
  const rate = limiter.check(clientKey(req));
  if (rate.allowed) return undefined;
  return errorResponse(429, "You have made a lot of requests. Try again in a few minutes.", {
    "Retry-After": String(rate.retryAfterSeconds),
  });
}

/**
 * Runs a generation and turns its outcome into an HTTP response.
 * The cause of a failure is logged for the operator; the student only sees a safe message.
 */
export async function generationResponse(run: () => Promise<GenerationResult>): Promise<Response> {
  try {
    const result = await run();
    return Response.json(result satisfies NotesResponse, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof GenerationError) {
      console.error(`[notes] generation failed: ${err.code}`, err.cause ?? "");
      const { status, message } = ERROR_RESPONSES[err.code];
      return errorResponse(status, message);
    }
    console.error("[notes] unexpected error", err);
    return errorResponse(500, "Something went wrong. Try again.");
  }
}
