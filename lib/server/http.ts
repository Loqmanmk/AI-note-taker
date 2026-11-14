import { checkAllowance, type PlanStatus } from "../plans";
import type { NotesResponse } from "../schema";
import { getAccounts } from "./accounts";
import type { AuthUser } from "./auth";
import { RateLimiter } from "./rateLimiter";
import { formatLength, planDisplayName, requestLanguage, serverMessages, type ServerLanguage } from "./messages";
import { authenticate } from "./requestAuth";
import { GenerationError, type GenerationErrorCode, type GenerationResult } from "./studyPackGenerator";

/** Every AI request has a cost, so cap how often one client can ask. Shared by all notes routes. */
const limiter = new RateLimiter(10, 10 * 60 * 1000);

type MessageKey = "busy" | "declined" | "tooLongToProcess" | "misconfigured";

const ERROR_RESPONSES: Record<GenerationErrorCode, { status: number; message: MessageKey }> = {
  declined: { status: 422, message: "declined" },
  too_long: { status: 422, message: "tooLongToProcess" },
  misconfigured: { status: 500, message: "misconfigured" },
  rate_limited: { status: 503, message: "busy" },
  timeout: { status: 504, message: "busy" },
  unavailable: { status: 502, message: "busy" },
};

/** A message safe to show the student for any failure while writing notes. */
export function generationFailureMessage(err: unknown, language: ServerLanguage = "en"): string {
  const m = serverMessages(language);
  return err instanceof GenerationError ? m[ERROR_RESPONSES[err.code].message] : m.somethingWrong;
}

/** Why the plan refused a class, in the student's language. */
function planLimitMessage(status: PlanStatus, reason: "monthly_limit" | "too_long", language: ServerLanguage): string {
  const m = serverMessages(language);
  const name = planDisplayName(status.plan);
  if (reason === "too_long") return m.tooLongForPlan(name, formatLength(status.maxRecordingMinutes, m));
  return status.plan === "pro" ? m.monthlyLimitPro(status.classesPerMonth) : m.monthlyLimit(status.classesPerMonth, name);
}

export function errorResponse(status: number, message: string, headers?: HeadersInit) {
  return Response.json({ error: message }, { status, headers });
}

/** The code the apps look for to offer an upgrade. */
export const PLAN_LIMIT_CODE = "plan_limit";

/**
 * Returns a 402 response when the student's plan does not allow this class, otherwise nothing.
 * If the plan cannot be read, the class is allowed and the problem logged: an outage of the
 * usage tables should not stop students from getting their notes.
 */
export async function planLimitResponse(
  user: AuthUser | null,
  recordingSeconds: number,
  language: ServerLanguage = "en",
): Promise<Response | undefined> {
  const plans = getAccounts().plans;
  if (!user || !plans) return undefined;
  let status: PlanStatus;
  try {
    status = await plans.status(user);
  } catch (err) {
    console.error("[plans] could not check the plan; allowing this class", err);
    return undefined;
  }
  const allowance = checkAllowance(status, recordingSeconds);
  if (allowance.ok) return undefined;
  return Response.json(
    { error: planLimitMessage(status, allowance.reason, language), code: PLAN_LIMIT_CODE, reason: allowance.reason },
    { status: 402, headers: { "Cache-Control": "no-store" } },
  );
}

/** Counts a class against the student's plan. A failure is logged: the notes are already written. */
export async function recordUsage(user: AuthUser | null, recordingSeconds: number): Promise<void> {
  const plans = getAccounts().plans;
  if (!user || !plans) return;
  await plans.recordUsage(user, recordingSeconds).catch((err: unknown) => {
    console.error("[plans] could not record usage", err);
  });
}

function clientKey(req: Request, user: AuthUser | null): string {
  // A signed-in student is limited per account, wherever they connect from.
  if (user) return `user:${user.id}`;
  // Trust this header only behind a proxy that sets it (Vercel, nginx, ...).
  return `ip:${req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"}`;
}

/** Returns a 429 response when the client has asked too often, otherwise nothing. */
export function rateLimitResponse(req: Request, user: AuthUser | null): Response | undefined {
  const rate = limiter.check(clientKey(req, user));
  if (rate.allowed) return undefined;
  return errorResponse(429, serverMessages(requestLanguage(req)).rateLimited, {
    "Retry-After": String(rate.retryAfterSeconds),
  });
}

/**
 * Checks who is asking and whether they may ask now.
 * Returns the student (null when accounts are off) or the response to send instead.
 */
export async function admitRequest(req: Request): Promise<{ user: AuthUser | null } | Response> {
  const { verifier, required } = getAccounts();
  const auth = await authenticate(req, verifier, required);
  if (!auth.ok) return errorResponse(auth.status, auth.message);
  return rateLimitResponse(req, auth.user) ?? { user: auth.user };
}

/** Saves a new study pack to the student's account. A failed save is logged and the notes are still returned. */
async function saveToAccount(
  user: AuthUser | null,
  result: GenerationResult,
  recordingSeconds: number,
): Promise<string | undefined> {
  const repository = getAccounts().repository;
  if (!user || !repository || result.demo) return undefined;
  try {
    const classId = await repository.save(user, result.pack);
    await recordUsage(user, recordingSeconds);
    return classId;
  } catch (err) {
    console.error("[notes] could not save the class", err);
    return undefined;
  }
}

/**
 * Runs a generation, saves the result for a signed-in student, and turns the outcome into an HTTP response.
 * The cause of a failure is logged for the operator; the student only sees a safe message.
 */
export async function generationResponse(
  user: AuthUser | null,
  run: () => Promise<GenerationResult>,
  recordingSeconds = 0,
  language: ServerLanguage = "en",
): Promise<Response> {
  try {
    const result = await run();
    const classId = await saveToAccount(user, result, recordingSeconds);
    const body: NotesResponse = { ...result, ...(classId ? { classId } : {}) };
    return Response.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof GenerationError) {
      console.error(`[notes] generation failed: ${err.code}`, err.cause ?? "");
      const { status } = ERROR_RESPONSES[err.code];
      return errorResponse(status, generationFailureMessage(err, language));
    }
    console.error("[notes] unexpected error", err);
    return errorResponse(500, serverMessages(language).somethingWrong);
  }
}
