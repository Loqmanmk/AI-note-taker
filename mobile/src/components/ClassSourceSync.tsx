import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { AccountClassSource, LocalClassSource } from "@/lib/classSources";
import { classStore } from "@/lib/classStore";
import { supabase } from "@/lib/supabase";

/** Points the class list at the signed-in student's account, or at the phone when accounts are off. */
export function ClassSourceSync() {
  const { enabled, session } = useAuth();
  const userId = session?.user.id;

  useEffect(() => {
    if (!enabled) classStore.setSource(new LocalClassSource());
    else if (userId && supabase) classStore.setSource(new AccountClassSource(supabase));
    else classStore.setSource(null);
  }, [enabled, userId]);

  return null;
}
