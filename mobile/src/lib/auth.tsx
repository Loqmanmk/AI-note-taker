import { createContext, use, useCallback, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { Platform } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { parseAuthRedirect } from "@shared/authRedirect";
import { supabase } from "./supabase";

// Closes the sign-in popup when the web version comes back from Google.
if (Platform.OS === "web") WebBrowser.maybeCompleteAuthSession();

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
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return;
    // Expo Go: exp://<computer>:8081 ; built app: focusnotes:// . Both must be allowed in Supabase.
    // No path, so the return link opens the home screen rather than an unknown page.
    const redirectTo = makeRedirectUri({ scheme: "focusnotes" });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error || !data.url) throw new Error("Could not open Google sign-in. Check your connection and try again.");

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== "success") return; // The student closed the window.

    const { code, error: redirectError } = parseAuthRedirect(result.url);
    if (redirectError || !code) {
      console.warn("[auth] sign-in did not return a code:", redirectError ?? result.url);
      throw new Error("Google sign-in was not completed. Try again.");
    }
    const exchange = await supabase.auth.exchangeCodeForSession(code);
    if (exchange.error) throw new Error("Could not finish signing in. Try again.");
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
