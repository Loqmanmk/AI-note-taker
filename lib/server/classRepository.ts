import "server-only";
import { createClient } from "@supabase/supabase-js";
import { CLASSES_TABLE } from "../classes";
import type { StudyPack } from "../schema";
import type { SupabaseConfig } from "../supabaseConfig";
import type { AuthUser } from "./auth";

/** Saves study packs to a student's account. */
export interface ClassRepository {
  /** Returns the id of the saved class. */
  save(user: AuthUser, pack: StudyPack): Promise<string>;
}

export class SupabaseClassRepository implements ClassRepository {
  constructor(private readonly config: SupabaseConfig) {}

  async save(user: AuthUser, pack: StudyPack): Promise<string> {
    // Acts as the student, so the database rules apply: a student can only write their own classes.
    const client = createClient(this.config.url, this.config.publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${user.accessToken}` } },
    });
    const { data, error } = await client
      .from(CLASSES_TABLE)
      .insert({ user_id: user.id, title: pack.title.slice(0, 500), subject: pack.subject.slice(0, 200), pack })
      .select("id")
      .single();
    if (error || !data) throw new Error(`Could not save the class: ${error?.message ?? "no row returned"}`);
    return String(data.id);
  }
}
