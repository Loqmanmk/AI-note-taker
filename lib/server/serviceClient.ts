import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readSupabaseConfig } from "../supabaseConfig";

let client: SupabaseClient | null | undefined;

/**
 * A client with the Supabase secret key, which bypasses the database rules. Only for server code
 * that has already checked who is asking: the payment webhook and the admin console.
 * Null when the secret key is not configured.
 */
export function serviceClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  const config = readSupabaseConfig(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();
  client =
    config && secretKey
      ? createClient(config.url, secretKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        })
      : null;
  return client;
}
