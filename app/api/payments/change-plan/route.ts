import { z } from "zod";
import { getAccounts } from "@/lib/server/accounts";
import { errorResponse } from "@/lib/server/http";
import { getPayments } from "@/lib/server/payments";
import {
  PlanChangeError,
  changePaddleSubscriptionPrice,
} from "@/lib/server/payments/paddle";
import { authenticate } from "@/lib/server/requestAuth";

const ChangePlanSchema = z.object({
  plan: z.enum(["premium", "pro"]),
  billing: z.enum(["monthly", "yearly"]),
});

/**
 * Switches a student's existing Paddle subscription to another plan or billing period, instead of
 * opening a second subscription. Paddle then sends "subscription.updated", which updates the plan.
 */
export async function POST(req: Request) {
  const payments = getPayments();
  if (!payments) return errorResponse(503, "Payments are not set up.");

  const { verifier } = getAccounts();
  const auth = await authenticate(req, verifier, true);
  if (!auth.ok) return errorResponse(auth.status, auth.message);
  if (!auth.user) return errorResponse(401, "Sign in first.");

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return errorResponse(400, "The request was not valid JSON.");
  }
  const parsed = ChangePlanSchema.safeParse(json);
  if (!parsed.success) return errorResponse(400, "Invalid plan.");

  const subscription = await payments.store.findForUser(auth.user.id);
  if (!subscription)
    return errorResponse(404, "You have no paid subscription to change.");

  try {
    await changePaddleSubscriptionPrice(
      payments.apiKey,
      payments.paddle.environment,
      subscription.subscriptionId,
      payments.paddle.prices[parsed.data.plan][parsed.data.billing],
    );
    return Response.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    if (err instanceof PlanChangeError) return errorResponse(409, err.message);
    console.error("[payments] could not change the plan", err);
    return errorResponse(
      502,
      "Could not change your plan. Try again, or use “Manage my subscription”.",
    );
  }
}
