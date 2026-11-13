import { createContext, use, useCallback, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { Platform } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { isRunningInExpoGo } from "expo";
import { makeRedirectUri } from "expo-auth-session";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { expoGoReturnAddress, parseAuthRedirect } from "@shared/authRedirect";
import { supabase } from "./supabase";

// Closes the sign-in popup when the web version comes back from Google.
if (Platform.OS === "web") WebBrowser.maybeCompleteAuthSession();

/**
 * Where Google and Supabase send the student back to. Both forms must be allowed in Supabase.
 * - Expo Go: exp://<computer>:8081/--/ . Expo Go cannot open focusnotes:// links, and it drops the
 *   query string (the sign-in code) from exp:// links without "/--/". Expo Go is detected from
 *   its native module, because some Expo Go versions report another execution environment, which
 *   makes makeRedirectUri return focusnotes:// there.
 * - Installed app or development build: focusnotes://
 * No further path, so the return link opens the home screen rather than an unknown page.
 */
export function getAuthReturnAddress(): string {
  if (Platform.OS !== "web" && isRunningInExpoGo()) {
    const address = expoGoReturnAddress(Constants.expoConfig?.hostUri);
    if (address) return address;
  }
  return makeRedirectUri({ scheme: "focusnotes" });
}

/** Hides the one-time code before a link is written to the logs. */
function forLogs(url: string): string {
  return url.replace(/code=[^&#]+/, "code=<hidden>");
}

/** Codes already exchanged, since a return link can arrive through two routes at once. */
const exchangedCodes = new Set<string>();

/**
 * Finishes sign-in from the link Supabase returned to. Returns false when the link holds no code.
 * Throws an Error safe to show when Google or Supabase reported a problem.
 */
async function completeSignIn(url: string): Promise<boolean> {
  if (!supabase) return false;
  const { code, error } = parseAuthRedirect(url);
  if (error) {
    console.warn("[auth] sign-in returned an error:", error);
    throw new Error("Google sign-in was not completed. Try again.");
  }
  if (!code) return false;
  if (exchangedCodes.has(code)) return true;
  exchangedCodes.add(code);

  const exchange = await supabase.auth.exchangeCodeForSession(code);
  if (exchange.error) {
    console.warn("[auth] could not exchange the code:", exchange.error.message);
    throw new Error("Could not finish signing in. Try again.");
  }
  console.info("[auth] signed in");
  return true;
}

type AuthContextValue = {
  /** False when accounts are not set up; the app then works without signing in. */
  enabled: boolean;
  isLoading: boolean;
  session: Session | null;
  /** Resolves when signed in or cancelled; throws an Error safe to show when it fails. */
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = use(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>");
  return value;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setIsLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));

    // Some Android phones reopen the app with the return link without telling the browser
    // window it succeeded. Catch the link here too, so sign-in still completes.
    const onLink = (url: string | null) => {
      if (!url || !url.includes("code=")) return;
      console.info("[auth] app opened by return link:", forLogs(url));
      completeSignIn(url).catch(() => {});
    };
    Linking.getInitialURL().then(onLink);
    const linkSubscription = Linking.addEventListener("url", ({ url }) => onLink(url));

    return () => {
      active = false;
      data.subscription.unsubscribe();
      linkSubscription.remove();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return;
    const redirectTo = getAuthReturnAddress();
    console.info(
      `[auth] opening Google sign-in (${isRunningInExpoGo() ? "Expo Go" : "app build"}); Supabase must allow the return address`,
      redirectTo,
    );

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error || !data.url) throw new Error("Could not open Google sign-in. Check your connection and try again.");

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    console.info(
      "[auth] browser closed:",
      result.type,
      result.type === "success" ? forLogs(result.url) : "(no return link reached the app)",
    );
    if (result.type !== "success") return; // Closed by the student, or the return link was caught above.

    if (!(await completeSignIn(result.url))) {
      console.warn("[auth] the return link had no code:", forLogs(result.url));
      throw new Error("Google sign-in was not completed. Try again.");
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
  }, []);

  const value = useMemo(
    () => ({ enabled: Boolean(supabase), isLoading, session, signInWithGoogle, signOut }),
    [isLoading, session, signInWithGoogle, signOut],
  );
  return <AuthContext value={value}>{children}</AuthContext>;
}
