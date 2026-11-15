import { getAccounts } from "@/lib/server/accounts";
import { errorResponse } from "@/lib/server/http";
import { getPayments } from "@/lib/server/payments";
import { createPaddlePortalUrl } from "@/lib/server/payments/paddle";
import { authenticate } from "@/lib/server/requestAuth";

/** Gives a signed-in student a link to manage their subscription on Paddle: cancel, switch plan, change card. */
export async function POST(req: Request) {
  const payments = getPayments();
  if (!payments) return errorResponse(503, "Payments are not set up.");

  const { verifier } = getAccounts();
  const auth = await authenticate(req, verifier, true);
  if (!auth.ok) return errorResponse(auth.status, auth.message);
  if (!auth.user) return errorResponse(401, "Sign in first.");

  const subscription = await payments.store.findForUser(auth.user.id);
  if (!subscription)
    return errorResponse(404, "You have no paid subscription.");

  try {
    const url = await createPaddlePortalUrl(
      payments.apiKey,
      payments.paddle.environment,
      subscription.customerId,
      subscription.subscriptionId,
    );
    return Response.json({ url }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[payments] could not open the subscription page", err);
    return errorResponse(
      502,
      "Could not open your subscription page. Try again.",
    );
  }
}
