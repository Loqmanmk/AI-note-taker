import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readSupabaseConfig } from "../supabaseConfig";

// Next.js replaces these with their values at build time, so they must be written out in full.
const config = readSupabaseConfig(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
let client: SupabaseClient | undefined;

/** The browser's Supabase client, or null when accounts are not set up. */
export function getSupabase(): SupabaseClient | null {
  if (!config) return null;
  client ??= createClient(config.url, config.publishableKey, {
    // PKCE: Google sends back a one-time code, never the session itself, in the address bar.
    auth: { flowType: "pkce", detectSessionInUrl: true, persistSession: true, autoRefreshToken: true },
  });
  return client;
}
