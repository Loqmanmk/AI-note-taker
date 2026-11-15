import type { PaidPlan } from "../../paymentsConfig";

/** What a payment service says about a student's subscription, in this app's terms. */
export type SubscriptionChange = {
  userId: string;
  plan: PaidPlan;
  /** When the plan stops; in the past for a canceled or paused subscription. */
  expiresAt: string;
  /** The payment service's own status (active, past_due, canceled...). */
  status: string;
  provider: "paddle";
  customerId: string;
  subscriptionId: string;
  /** When the payment service made this change; older notifications must not undo newer ones. */
  changedAt: string;
};

/** Statuses where the student keeps the plan until the end of the period. */
export const PAYING_STATUSES: ReadonlySet<string> = new Set([
  "active",
  "trialing",
  "past_due",
]);

type SavedSubscription = {
  subscriptionId: string | null;
  status: string | null;
  changedAt: string | null;
};

/**
 * Whether a change should replace what is saved. Notifications can arrive late or out of order:
 * an older one never undoes a newer one, and ending an old subscription never ends a different,
 * newer one the student bought since.
 */
export function shouldApply(
  saved: SavedSubscription | null,
  change: SubscriptionChange,
): boolean {
  if (!saved) return true;
  if (saved.changedAt && new Date(saved.changedAt) > new Date(change.changedAt))
    return false;
  const otherSubscription =
    saved.subscriptionId !== null &&
    saved.subscriptionId !== change.subscriptionId;
  if (
    otherSubscription &&
    saved.status &&
    PAYING_STATUSES.has(saved.status) &&
    !PAYING_STATUSES.has(change.status)
  ) {
    return false;
  }
  return true;
}

/** Where subscription changes are saved. */
export interface SubscriptionStore {
  /** Saves the change unless a newer one is already saved. Returns whether it was saved. */
  apply(change: SubscriptionChange): Promise<boolean>;
  /** The payment service ids of a student's subscription, if they have one. */
  findForUser(
    userId: string,
  ): Promise<{ customerId: string; subscriptionId: string } | null>;
}
