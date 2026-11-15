import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { planForPrice, type PaddlePublicConfig } from "../../paymentsConfig";
import { PAYING_STATUSES, type SubscriptionChange } from "./subscriptionChange";

/** How old a notification may be before it is refused, against replays. */
const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;
/** Access continues this long after a billing period ends, while a renewal is being charged and notified. */
const RENEWAL_GRACE_MS = 2 * 24 * 60 * 60 * 1000;

/**
 * Checks the Paddle-Signature header ("ts=<seconds>;h1=<hex>"), an HMAC-SHA256 of "<ts>:<raw body>"
 * with the notification destination's secret. Refuses old timestamps so a captured call cannot be replayed.
 */
export function verifyPaddleSignature(
  rawBody: string,
  header: string | null,
  secret: string,
  now = Date.now(),
): boolean {
  if (!header || !secret) return false;
  const parts = header.split(";").map((part) => part.trim().split("="));
  const timestamp = parts.find(([key]) => key === "ts")?.[1];
  const signatures = parts
    .filter(([key]) => key === "h1")
    .map(([, value]) => value ?? "");
  if (!timestamp || !/^\d+$/.test(timestamp) || signatures.length === 0)
    return false;
  if (Math.abs(now / 1000 - Number(timestamp)) > SIGNATURE_TOLERANCE_SECONDS)
    return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}:${rawBody}`)
    .digest();
  return signatures.some((signature) => {
    if (!/^[0-9a-f]{64}$/i.test(signature)) return false;
    return timingSafeEqual(expected, Buffer.from(signature, "hex"));
  });
}

const SubscriptionEventSchema = z.object({
  event_type: z.string(),
  occurred_at: z.string(),
  data: z.object({
    id: z.string(),
    status: z.string(),
    customer_id: z.string(),
    updated_at: z.string().optional(),
    canceled_at: z.string().nullish(),
    paused_at: z.string().nullish(),
    custom_data: z.record(z.string(), z.unknown()).nullish(),
    items: z.array(z.object({ price: z.object({ id: z.string() }) })).min(1),
    current_billing_period: z.object({ ends_at: z.string() }).nullish(),
  }),
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Turns a Paddle notification into a subscription change, or null when it is not about a
 * subscription of this app (other events, unknown prices, or no student id in custom data).
 */
export function paddleEventToChange(
  event: unknown,
  config: PaddlePublicConfig,
): SubscriptionChange | null {
  if (typeof event !== "object" || event === null) return null;
  const type = (event as { event_type?: unknown }).event_type;
  if (typeof type !== "string" || !type.startsWith("subscription."))
    return null;

  const parsed = SubscriptionEventSchema.safeParse(event);
  if (!parsed.success) return null;
  const { data, occurred_at } = parsed.data;

  const userId = data.custom_data?.user_id;
  if (typeof userId !== "string" || !UUID.test(userId)) return null;
  const plan = planForPrice(config, data.items[0].price.id);
  if (!plan) return null;

  const changedAt = data.updated_at ?? occurred_at;
  const periodEnd = data.current_billing_period?.ends_at;
  const expiresAt =
    PAYING_STATUSES.has(data.status) && periodEnd
      ? new Date(new Date(periodEnd).getTime() + RENEWAL_GRACE_MS).toISOString()
      : // Canceled or paused: the plan ends now.
        (data.canceled_at ?? data.paused_at ?? changedAt);

  return {
    userId,
    plan,
    expiresAt,
    status: data.status,
    provider: "paddle",
    customerId: data.customer_id,
    subscriptionId: data.id,
    changedAt,
  };
}

/** A link to Paddle's page where the student cancels, changes plan or updates their card. */
export async function createPaddlePortalUrl(
  apiKey: string,
  environment: PaddlePublicConfig["environment"],
  customerId: string,
  subscriptionId: string,
): Promise<string> {
  const base =
    environment === "production"
      ? "https://api.paddle.com"
      : "https://sandbox-api.paddle.com";
  const res = await fetch(
    `${base}/customers/${encodeURIComponent(customerId)}/portal-sessions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ subscription_ids: [subscriptionId] }),
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (!res.ok) throw new Error(`Paddle portal session failed: ${res.status}`);
  const body = (await res.json()) as {
    data?: { urls?: { general?: { overview?: string } } };
  };
  const url = body.data?.urls?.general?.overview;
  if (!url) throw new Error("Paddle portal session had no link");
  return url;
}
