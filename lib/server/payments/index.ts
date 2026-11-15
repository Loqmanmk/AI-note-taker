import "server-only";
import {
  readPaddlePublicConfig,
  type PaddlePublicConfig,
} from "../../paymentsConfig";
import { readSupabaseConfig } from "../../supabaseConfig";
import type { SubscriptionStore } from "./subscriptionChange";
import { SupabaseSubscriptionStore } from "./supabaseSubscriptionStore";

export type Payments = {
  paddle: PaddlePublicConfig;
  /** Secret used to check Paddle's notification signatures. */
  webhookSecret: string;
  /** Paddle API key, for the "manage my subscription" link. */
  apiKey: string;
  store: SubscriptionStore;
};

let payments: Payments | null | undefined;

/** Payments are on once Paddle and the Supabase secret key are configured; otherwise null. */
export function getPayments(): Payments | null {
  if (payments !== undefined) return payments;
  const paddle = readPaddlePublicConfig();
  const supabase = readSupabaseConfig(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET?.trim() ?? "";
  const apiKey = process.env.PADDLE_API_KEY?.trim() ?? "";
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim() ?? "";
  payments =
    paddle && supabase && webhookSecret && apiKey && secretKey
      ? {
          paddle,
          webhookSecret,
          apiKey,
          store: new SupabaseSubscriptionStore(supabase.url, secretKey),
        }
      : null;
  return payments;
}
