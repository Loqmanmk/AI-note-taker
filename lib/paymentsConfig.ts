import type { Billing, PlanId } from "./plans";

/** Paid plans and their billing periods. */
export type PaidPlan = Exclude<PlanId, "free">;

/**
 * Paddle settings the browser needs to open the checkout. All of them are public by design:
 * the client token can only open checkouts, and price ids are shown in every checkout.
 */
export type PaddlePublicConfig = {
  environment: "sandbox" | "production";
  clientToken: string;
  prices: Record<PaidPlan, Record<Billing, string>>;
};

/** Null until every Paddle setting is present, so payments stay off rather than half-working. */
export function readPaddlePublicConfig(): PaddlePublicConfig | null {
  // Next.js replaces these with their values at build time, so they must be written out in full.
  const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim() ?? "";
  const prices = {
    premium: {
      monthly:
        process.env.NEXT_PUBLIC_PADDLE_PRICE_PREMIUM_MONTHLY?.trim() ?? "",
      yearly: process.env.NEXT_PUBLIC_PADDLE_PRICE_PREMIUM_YEARLY?.trim() ?? "",
    },
    pro: {
      monthly: process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_MONTHLY?.trim() ?? "",
      yearly: process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_YEARLY?.trim() ?? "",
    },
  };
  const allPrices = [
    prices.premium.monthly,
    prices.premium.yearly,
    prices.pro.monthly,
    prices.pro.yearly,
  ];
  if (!clientToken || allPrices.some((price) => !price)) return null;
  return {
    environment:
      process.env.NEXT_PUBLIC_PADDLE_ENV === "production"
        ? "production"
        : "sandbox",
    clientToken,
    prices,
  };
}

/** Which plan a Paddle price unlocks; null for a price this app does not sell. */
export function planForPrice(
  config: PaddlePublicConfig,
  priceId: string,
): PaidPlan | null {
  for (const plan of ["premium", "pro"] as const) {
    if (
      config.prices[plan].monthly === priceId ||
      config.prices[plan].yearly === priceId
    )
      return plan;
  }
  return null;
}
