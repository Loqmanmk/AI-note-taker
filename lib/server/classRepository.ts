import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { CLASSES_TABLE } from "../classes";
import type { StudyPack } from "../schema";
import type { SupabaseConfig } from "../supabaseConfig";
import type { AuthUser } from "./auth";

/** Saves study packs to a student's account. */
export interface ClassRepository {
  /** Saves finished notes. Returns the id of the saved class. */
  save(user: AuthUser, pack: StudyPack): Promise<string>;
  /** Creates a class whose notes will be written in the background. Returns its id. */
  createProcessing(user: AuthUser): Promise<string>;
  complete(user: AuthUser, classId: string, pack: StudyPack): Promise<void>;
  /** Marks a background job as failed with a message safe to show the student. */
  fail(user: AuthUser, classId: string, message: string): Promise<void>;
}

/** What the table stores for a finished class. Titles are capped like the table's checks. */
function readyColumns(pack: StudyPack) {
  return { status: "ready", error: null, title: pack.title.slice(0, 500), subject: pack.subject.slice(0, 200), pack };
}

export class SupabaseClassRepository implements ClassRepository {
  constructor(private readonly config: SupabaseConfig) {}

  /** Acts as the student, so the database rules apply: a student can only write their own classes. */
  private clientFor(user: AuthUser): SupabaseClient {
    return createClient(this.config.url, this.config.publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${user.accessToken}` } },
    });
  }

  async save(user: AuthUser, pack: StudyPack): Promise<string> {
    const { data, error } = await this.clientFor(user)
      .from(CLASSES_TABLE)
      .insert({ user_id: user.id, ...readyColumns(pack) })
      .select("id")
      .single();
    if (error || !data) throw new Error(`Could not save the class: ${error?.message ?? "no row returned"}`);
    return String(data.id);
  }

  async createProcessing(user: AuthUser): Promise<string> {
    const { data, error } = await this.clientFor(user)
      .from(CLASSES_TABLE)
      .insert({ user_id: user.id, status: "processing", pack: null })
      .select("id")
      .single();
    if (error || !data) throw new Error(`Could not create the class: ${error?.message ?? "no row returned"}`);
    return String(data.id);
  }

  async complete(user: AuthUser, classId: string, pack: StudyPack): Promise<void> {
    await this.update(user, classId, readyColumns(pack));
  }

  async fail(user: AuthUser, classId: string, message: string): Promise<void> {
    await this.update(user, classId, { status: "failed", error: message.slice(0, 500) });
  }

  private async update(user: AuthUser, classId: string, columns: Record<string, unknown>) {
    const { data, error } = await this.clientFor(user)
      .from(CLASSES_TABLE)
      .update(columns)
      .eq("id", classId)
      .select("id");
    if (error || !data?.length) throw new Error(`Could not update the class: ${error?.message ?? "not found"}`);
  }
}
