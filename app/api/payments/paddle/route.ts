import { getPayments } from "@/lib/server/payments";
import {
  paddleEventToChange,
  verifyPaddleSignature,
} from "@/lib/server/payments/paddle";

/** Paddle notifications are small; anything bigger is not from Paddle. */
const MAX_BODY_CHARS = 200_000;

/**
 * Receives Paddle's notifications (subscription created, renewed, canceled...) and updates the
 * student's plan. Only calls signed with the notification secret are accepted.
 */
export async function POST(req: Request) {
  const payments = getPayments();
  if (!payments)
    return Response.json(
      { error: "Payments are not set up." },
      { status: 503 },
    );

  const raw = await req.text();
  if (raw.length > MAX_BODY_CHARS)
    return Response.json({ error: "Too large." }, { status: 413 });
  if (
    !verifyPaddleSignature(
      raw,
      req.headers.get("paddle-signature"),
      payments.webhookSecret,
    )
  ) {
    return Response.json({ error: "Invalid signature." }, { status: 401 });
  }

  let event: unknown;
  try {
    event = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const change = paddleEventToChange(event, payments.paddle);
  if (!change) return Response.json({ ok: true, ignored: true }); // Not a subscription of this app.

  try {
    const saved = await payments.store.apply(change);
    console.info(
      `[payments] ${change.subscriptionId} ${change.status} → ${change.plan}${saved ? "" : " (older, ignored)"}`,
    );
    return Response.json({ ok: true });
  } catch (err) {
    // A failure answer makes Paddle send the notification again later.
    console.error("[payments] could not save a subscription change", err);
    return Response.json({ error: "Could not save." }, { status: 500 });
  }
}
