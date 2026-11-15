import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUBSCRIPTIONS_TABLE } from "../../planStatus";
import {
  shouldApply,
  type SubscriptionChange,
  type SubscriptionStore,
} from "./subscriptionChange";

/**
 * Saves subscriptions with the service role, which bypasses the database rules: only the payment
 * webhook uses it, after checking the payment service's signature. Students can never write plans.
 */
export class SupabaseSubscriptionStore implements SubscriptionStore {
  private readonly client: SupabaseClient;

  constructor(url: string, secretKey: string) {
    this.client = createClient(url, secretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  async apply(change: SubscriptionChange): Promise<boolean> {
    const existing = await this.client
      .from(SUBSCRIPTIONS_TABLE)
      .select("provider_subscription_id, status, provider_updated_at")
      .eq("user_id", change.userId)
      .maybeSingle();
    if (existing.error)
      throw new Error(
        `Could not read the subscription: ${existing.error.message}`,
      );

    const saved = existing.data
      ? {
          subscriptionId: existing.data.provider_subscription_id,
          status: existing.data.status,
          changedAt: existing.data.provider_updated_at,
        }
      : null;
    if (!shouldApply(saved, change)) return false;

    const { error } = await this.client.from(SUBSCRIPTIONS_TABLE).upsert({
      user_id: change.userId,
      plan: change.plan,
      expires_at: change.expiresAt,
      provider: change.provider,
      provider_customer_id: change.customerId,
      provider_subscription_id: change.subscriptionId,
      status: change.status,
      provider_updated_at: change.changedAt,
      updated_at: new Date().toISOString(),
    });
    if (error)
      throw new Error(`Could not save the subscription: ${error.message}`);
    return true;
  }

  async findForUser(userId: string) {
    const { data, error } = await this.client
      .from(SUBSCRIPTIONS_TABLE)
      .select("provider, provider_customer_id, provider_subscription_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (error)
      throw new Error(`Could not read the subscription: ${error.message}`);
    if (
      data?.provider !== "paddle" ||
      !data.provider_customer_id ||
      !data.provider_subscription_id
    )
      return null;
    return {
      customerId: data.provider_customer_id,
      subscriptionId: data.provider_subscription_id,
    };
  }
}
