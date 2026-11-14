import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { AccountClassSource, LocalClassSource } from "@/lib/classSources";
import { classStore } from "@/lib/classStore";
import { sendQueue } from "@/lib/sendQueue";
import { supabase } from "@/lib/supabase";

/** Matches no recording, so nothing waiting shows while signed out. */
const SIGNED_OUT = "signed-out";

/** Points the class list at the signed-in student's account, or at the phone when accounts are off. */
export function ClassSourceSync() {
  const { enabled, session } = useAuth();
  const userId = session?.user.id;

  useEffect(() => {
    if (!enabled) classStore.setSource(new LocalClassSource());
    else if (userId && supabase) classStore.setSource(new AccountClassSource(supabase));
    else classStore.setSource(null);

    // Recordings waiting for notes belong to the student who made them.
    sendQueue.setUser(enabled ? (userId ?? SIGNED_OUT) : null);
  }, [enabled, userId]);

  return null;
}
