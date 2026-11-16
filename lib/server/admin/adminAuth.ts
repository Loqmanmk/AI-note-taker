import "server-only";
import { getAccounts } from "../accounts";
import { errorResponse } from "../http";
import { authenticate } from "../requestAuth";
import { serviceClient } from "../serviceClient";

export type Admin = { id: string; email: string };

/** Emails allowed into the admin console, from ADMIN_EMAILS (comma separated). */
export function adminEmails(value = process.env.ADMIN_EMAILS): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.includes("@")),
  );
}

/**
 * The signed-in admin, or the response to send instead. The token is verified with Supabase, then
 * the account's email (read from Supabase, never from the request) must be in ADMIN_EMAILS.
 */
export async function requireAdmin(req: Request): Promise<Admin | Response> {
  const allowed = adminEmails();
  const client = serviceClient();
  if (allowed.size === 0 || !client)
    return errorResponse(503, "The admin console is not set up.");

  const { verifier } = getAccounts();
  const auth = await authenticate(req, verifier, true);
  if (!auth.ok) return errorResponse(auth.status, auth.message);
  if (!auth.user) return errorResponse(401, "Sign in first.");

  const { data, error } = await client.auth.admin.getUserById(auth.user.id);
  const email = data.user?.email?.toLowerCase();
  if (error || !email || !allowed.has(email)) {
    console.warn(`[admin] refused access for user ${auth.user.id}`);
    return errorResponse(403, "This account is not an admin.");
  }
  return { id: auth.user.id, email };
}

/** Records what an admin did, for the history shown in the console. Never blocks the action. */
export async function audit(
  admin: Admin,
  action: string,
  target?: string,
  details?: Record<string, unknown>,
) {
  const { error } = (await serviceClient()
    ?.from("admin_audit")
    .insert({
      admin_email: admin.email,
      action,
      target: target ?? null,
      details: details ?? null,
    })) ?? { error: null };
  if (error)
    console.error("[admin] could not record the action", error.message);
}
