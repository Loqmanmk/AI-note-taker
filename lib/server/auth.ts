import "server-only";
import { createClient, isAuthRetryableFetchError, type SupabaseClient } from "@supabase/supabase-js";
import type { SupabaseConfig } from "../supabaseConfig";

/** A signed-in student, as proven by their access token. */
export type AuthUser = { id: string; accessToken: string };

/** Checks an access token. Returns null when it is invalid or expired; throws when the check itself fails. */
export interface AuthVerifier {
  verify(accessToken: string): Promise<AuthUser | null>;
}

/** Thrown when the sign-in service cannot be reached, so a valid student is not told to sign in again. */
export class AuthUnavailableError extends Error {
  constructor(options?: ErrorOptions) {
    super("auth_unavailable", options);
    this.name = "AuthUnavailableError";
  }
}

export class SupabaseAuthVerifier implements AuthVerifier {
  private readonly client: SupabaseClient;

  constructor(config: SupabaseConfig) {
    this.client = createClient(config.url, config.publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }

  async verify(accessToken: string): Promise<AuthUser | null> {
    let result: Awaited<ReturnType<SupabaseClient["auth"]["getClaims"]>>;
    try {
      // Checks the token's signature and expiry against the project's published keys.
      result = await this.client.auth.getClaims(accessToken);
    } catch (err) {
      // A malformed token makes the library throw rather than return an error.
      if (isAuthRetryableFetchError(err)) throw new AuthUnavailableError({ cause: err });
      return null;
    }
    const { data, error } = result;
    if (error) {
      if (isAuthRetryableFetchError(error)) throw new AuthUnavailableError({ cause: error });
      return null;
    }
    const subject = data?.claims.sub;
    return typeof subject === "string" && subject !== "" ? { id: subject, accessToken } : null;
  }
}
