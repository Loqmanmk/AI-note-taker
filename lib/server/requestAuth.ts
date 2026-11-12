import { AuthUnavailableError, type AuthUser, type AuthVerifier } from "./auth";

export type AuthOutcome = { ok: true; user: AuthUser | null } | { ok: false; status: number; message: string };

/** The token from an "Authorization: Bearer <token>" header. */
export function bearerToken(req: Request): string | undefined {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return match?.[1];
}

/**
 * Decides who is making a request.
 * A null user means accounts are off and anonymous use is allowed.
 */
export async function authenticate(req: Request, verifier: AuthVerifier | null, required: boolean): Promise<AuthOutcome> {
  if (!verifier) {
    return required
      ? { ok: false, status: 500, message: "The server is not configured correctly." }
      : { ok: true, user: null };
  }

  const token = bearerToken(req);
  if (!token) return { ok: false, status: 401, message: "Sign in to create notes." };

  try {
    const user = await verifier.verify(token);
    return user ? { ok: true, user } : { ok: false, status: 401, message: "Your session has expired. Sign in again." };
  } catch (err) {
    if (err instanceof AuthUnavailableError) {
      console.error("[auth] sign-in service unavailable", err.cause ?? "");
      return { ok: false, status: 503, message: "Sign-in is unavailable right now. Try again in a minute." };
    }
    throw err;
  }
}
