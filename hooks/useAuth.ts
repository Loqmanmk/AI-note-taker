import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/client/supabase";

/** The signed-in student, and how to sign in and out. Disabled when accounts are not set up. */
export function useAuth() {
  const supabase = getSupabase();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  const signIn = useCallback(async () => {
    if (!supabase) return;
    setError("");
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      // Come back to the same page, such as the account deletion page.
      options: { redirectTo: `${window.location.origin}${window.location.pathname}` },
    });
    if (signInError) setError("Could not open Google sign-in. Try again.");
  }, [supabase]);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
  }, [supabase]);

  return { enabled: Boolean(supabase), loading, session, error, signIn, signOut };
}
