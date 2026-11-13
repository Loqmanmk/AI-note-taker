import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { RECORDINGS_BUCKET } from "../recordings";
import type { SupabaseConfig } from "../supabaseConfig";
import type { AuthUser } from "./auth";

/** Where phones upload class recordings before notes are written. */
export interface RecordingStore {
  /** Resolves to null when the file does not exist or is not the student's. */
  download(user: AuthUser, path: string): Promise<Blob | null>;
  remove(user: AuthUser, path: string): Promise<void>;
}

export class SupabaseRecordingStore implements RecordingStore {
  constructor(private readonly config: SupabaseConfig) {}

  /** Acts as the student, so the storage rules apply: only their own folder is reachable. */
  private clientFor(user: AuthUser): SupabaseClient {
    return createClient(this.config.url, this.config.publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${user.accessToken}` } },
    });
  }

  async download(user: AuthUser, path: string): Promise<Blob | null> {
    const { data, error } = await this.clientFor(user).storage.from(RECORDINGS_BUCKET).download(path);
    if (error || !data) return null;
    return data;
  }

  async remove(user: AuthUser, path: string): Promise<void> {
    const { error } = await this.clientFor(user).storage.from(RECORDINGS_BUCKET).remove([path]);
    if (error) throw new Error(`Could not delete the recording: ${error.message}`);
  }
}
