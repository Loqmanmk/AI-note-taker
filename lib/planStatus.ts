import type { SupabaseClient } from "@supabase/supabase-js";
import { CLASSES_TABLE } from "./classes";
import { PLANS, effectivePlan, startOfMonth, type PlanStatus } from "./plans";

export const SUBSCRIPTIONS_TABLE = "subscriptions";
export const CLASS_USAGE_TABLE = "class_usage";

/** A class still "processing" after this long was cut off and will never finish, so it stops counting. */
const PROCESSING_COUNTS_FOR_MS = 10 * 60 * 1000;

/**
 * Reads the plan and this month's usage of the signed-in student, through a client acting as them.
 * Used by the server to enforce the limits and by the apps to display them.
 * Classes still being written count too, so sending several at once cannot go past the limit.
 */
export async function readPlanStatus(client: SupabaseClient, now = new Date()): Promise<PlanStatus> {
  const monthStart = startOfMonth(now);
  const processingSince = new Date(Math.max(monthStart.getTime(), now.getTime() - PROCESSING_COUNTS_FOR_MS));

  const [subscription, used, processing] = await Promise.all([
    client.from(SUBSCRIPTIONS_TABLE).select("plan, expires_at").maybeSingle(),
    client.from(CLASS_USAGE_TABLE).select("id", { count: "exact", head: true }).gte("created_at", monthStart.toISOString()),
    client
      .from(CLASSES_TABLE)
      .select("id", { count: "exact", head: true })
      .eq("status", "processing")
      .gte("created_at", processingSince.toISOString()),
  ]);
  const error = subscription.error ?? used.error ?? processing.error;
  if (error) throw new Error(`Could not read the plan: ${error.message}`);

  const plan = PLANS[effectivePlan(subscription.data, now)];
  return {
    plan: plan.id,
    classesUsed: (used.count ?? 0) + (processing.count ?? 0),
    classesPerMonth: plan.classesPerMonth,
    maxRecordingMinutes: plan.maxRecordingMinutes,
  };
}
