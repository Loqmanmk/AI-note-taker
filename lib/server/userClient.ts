import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { SupabaseConfig } from "../supabaseConfig";
import type { AuthUser } from "./auth";

/** A client that acts as the student, so the database rules apply: a student only reaches their own data. */
export function userClient(config: SupabaseConfig, user: AuthUser): SupabaseClient {
  return createClient(config.url, config.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${user.accessToken}` } },
  });
}
