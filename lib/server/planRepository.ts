import "server-only";
import { CLASS_USAGE_TABLE, readPlanStatus } from "../planStatus";
import type { PlanStatus } from "../plans";
import type { AiPath } from "./studyPackGenerator";
import type { SupabaseConfig } from "../supabaseConfig";
import type { AuthUser } from "./auth";
import { userClient } from "./userClient";

/** Each student's plan and how much of it they used. */
export interface PlanRepository {
  status(user: AuthUser): Promise<PlanStatus>;
  /** Counts a class whose notes were written. */
  recordUsage(user: AuthUser, recordingSeconds: number, aiPath?: AiPath): Promise<void>;
}

export class SupabasePlanRepository implements PlanRepository {
  constructor(private readonly config: SupabaseConfig) {}

  status(user: AuthUser): Promise<PlanStatus> {
    return readPlanStatus(userClient(this.config, user));
  }

  async recordUsage(user: AuthUser, recordingSeconds: number, aiPath?: AiPath): Promise<void> {
    const client = userClient(this.config, user);
    const row: Record<string, unknown> = {
      user_id: user.id,
      recording_seconds: Math.min(86_400, Math.max(0, Math.round(recordingSeconds))),
    };
    let { error } = await client.from(CLASS_USAGE_TABLE).insert(aiPath ? { ...row, ai_path: aiPath } : row);
    // A database without the ai_path column (migration not run yet) must still count the class.
    if (error && aiPath && /ai_path/.test(error.message)) ({ error } = await client.from(CLASS_USAGE_TABLE).insert(row));
    if (error) throw new Error(`Could not record usage: ${error.message}`);
  }
}
