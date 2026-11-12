import "server-only";
import { readSupabaseConfig } from "../supabaseConfig";
import { SupabaseAuthVerifier, type AuthVerifier } from "./auth";
import { SupabaseClassRepository, type ClassRepository } from "./classRepository";

export type Accounts = {
  /** Null when accounts are not set up. */
  verifier: AuthVerifier | null;
  repository: ClassRepository | null;
  /** Whether every request must come from a signed-in student. */
  required: boolean;
};

let accounts: Accounts | undefined;

/**
 * Accounts are on when Supabase is configured. Without it, development keeps working
 * anonymously so the app can be tried; production refuses requests rather than run open.
 */
export function getAccounts(): Accounts {
  if (accounts) return accounts;
  const config = readSupabaseConfig(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  if (config) {
    accounts = { verifier: new SupabaseAuthVerifier(config), repository: new SupabaseClassRepository(config), required: true };
  } else {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[accounts] Supabase is not configured: sign-in is off and classes are not saved online.");
    }
    accounts = { verifier: null, repository: null, required: process.env.NODE_ENV === "production" };
  }
  return accounts;
}
