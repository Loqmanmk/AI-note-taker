// Fills in the Web Crypto functions Supabase needs for secure sign-in. Keep this first.
import "./webCrypto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";
import { readSupabaseConfig } from "@shared/supabaseConfig";

// Expo replaces these with their values at build time, so they must be written out in full.
const config = readSupabaseConfig(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

/** The app's Supabase client, or null when accounts are not set up (sign-in is then skipped). */
export const supabase: SupabaseClient | null = config
  ? createClient(config.url, config.publishableKey, {
      auth: {
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        // Google sends back a one-time code, never the session itself, in the return link.
        flowType: "pkce",
      },
    })
  : null;

// On phones, keep the session fresh only while the app is in use, as Supabase recommends.
if (supabase && Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

/** The current access token, to prove to the server who is asking. */
export async function getAccessToken(): Promise<string | undefined> {
  if (!supabase) return undefined;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
}
