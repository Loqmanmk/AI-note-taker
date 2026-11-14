import "server-only";
import { RECORDINGS_BUCKET } from "../recordings";
import type { SupabaseConfig } from "../supabaseConfig";
import type { AuthUser } from "./auth";
import { userClient } from "./userClient";

/** Where phones upload class recordings before notes are written. */
export interface RecordingStore {
  /** Resolves to null when the file does not exist or is not the student's. */
  download(user: AuthUser, path: string): Promise<Blob | null>;
  remove(user: AuthUser, path: string): Promise<void>;
}

export class SupabaseRecordingStore implements RecordingStore {
  constructor(private readonly config: SupabaseConfig) {}

  private clientFor(user: AuthUser) {
    return userClient(this.config, user);
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
