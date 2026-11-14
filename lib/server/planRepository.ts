import "server-only";
import { CLASS_USAGE_TABLE, readPlanStatus } from "../planStatus";
import type { PlanStatus } from "../plans";
import type { SupabaseConfig } from "../supabaseConfig";
import type { AuthUser } from "./auth";
import { userClient } from "./userClient";

/** Each student's plan and how much of it they used. */
export interface PlanRepository {
  status(user: AuthUser): Promise<PlanStatus>;
  /** Counts a class whose notes were written. */
  recordUsage(user: AuthUser, recordingSeconds: number): Promise<void>;
}

export class SupabasePlanRepository implements PlanRepository {
  constructor(private readonly config: SupabaseConfig) {}

  status(user: AuthUser): Promise<PlanStatus> {
    return readPlanStatus(userClient(this.config, user));
  }

  async recordUsage(user: AuthUser, recordingSeconds: number): Promise<void> {
    const { error } = await userClient(this.config, user)
      .from(CLASS_USAGE_TABLE)
      .insert({ user_id: user.id, recording_seconds: Math.min(86_400, Math.max(0, Math.round(recordingSeconds))) });
    if (error) throw new Error(`Could not record usage: ${error.message}`);
  }
}
