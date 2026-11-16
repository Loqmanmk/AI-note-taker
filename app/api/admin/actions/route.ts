import { z } from "zod";
import { startOfMonth } from "@/lib/plans";
import { audit, requireAdmin } from "@/lib/server/admin/adminAuth";
import { setAppSetting } from "@/lib/server/appSettings";
import { errorResponse } from "@/lib/server/http";
import { PAYING_STATUSES } from "@/lib/server/payments/subscriptionChange";
import { serviceClient } from "@/lib/server/serviceClient";

const ActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("set_setting"),
    key: z.enum(["maintenance", "transcription"]),
    value: z.boolean(),
  }),
  z.object({
    action: z.literal("set_plan"),
    userId: z.uuid(),
    plan: z.enum(["free", "premium", "pro"]),
    /** Days the plan lasts; empty means it does not expire. */
    days: z.number().int().min(1).max(3650).nullable(),
  }),
  z.object({ action: z.literal("reset_usage"), userId: z.uuid() }),
]);

/** Admin actions. Each one is checked, applied with the service key, and written to the history. */
export async function POST(req: Request) {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;
  const client = serviceClient();
  if (!client)
    return errorResponse(503, "The Supabase secret key is not configured.");

  const parsed = ActionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return errorResponse(400, "Invalid action.");
  const input = parsed.data;

  try {
    if (input.action === "set_setting") {
      await setAppSetting(input.key, input.value, admin.email);
      await audit(admin, `setting.${input.key}`, undefined, {
        value: input.value,
      });
      return Response.json({ ok: true });
    }

    const { data: target } = await client.auth.admin.getUserById(input.userId);
    if (!target.user) return errorResponse(404, "User not found.");
    const email = target.user.email ?? input.userId;

    if (input.action === "reset_usage") {
      const { error } = await client
        .from("class_usage")
        .delete()
        .eq("user_id", input.userId)
        .gte("created_at", startOfMonth().toISOString());
      if (error) throw new Error(error.message);
      await audit(admin, "user.reset_usage", email);
      return Response.json({ ok: true });
    }

    // A plan paid on Paddle is managed by Paddle: a manual change would be overwritten at renewal.
    const { data: current } = await client
      .from("subscriptions")
      .select("provider, status")
      .eq("user_id", input.userId)
      .maybeSingle();
    if (
      current?.provider === "paddle" &&
      current.status &&
      PAYING_STATUSES.has(current.status)
    ) {
      return errorResponse(
        409,
        "This user pays through Paddle. Change or cancel their plan in the Paddle dashboard.",
      );
    }
    if (input.plan === "free") {
      const { error } = await client
        .from("subscriptions")
        .delete()
        .eq("user_id", input.userId);
      if (error) throw new Error(error.message);
    } else {
      const expires = input.days
        ? new Date(Date.now() + input.days * 24 * 60 * 60 * 1000).toISOString()
        : null;
      const { error } = await client.from("subscriptions").upsert({
        user_id: input.userId,
        plan: input.plan,
        expires_at: expires,
        provider: "manual",
        status: "active",
        provider_customer_id: null,
        provider_subscription_id: null,
        provider_updated_at: null,
        updated_at: new Date().toISOString(),
      });
      if (error) throw new Error(error.message);
    }
    await audit(admin, "user.set_plan", email, {
      plan: input.plan,
      days: input.days,
    });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[admin] action failed", err);
    return errorResponse(
      500,
      err instanceof Error ? err.message : "The action failed.",
    );
  }
}
