import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { planForPrice, type PaddlePublicConfig } from "../lib/paymentsConfig";
import {
  paddleEventToChange,
  verifyPaddleSignature,
} from "../lib/server/payments/paddle";
import {
  shouldApply,
  type SubscriptionChange,
} from "../lib/server/payments/subscriptionChange";

const config: PaddlePublicConfig = {
  environment: "sandbox",
  clientToken: "test_token",
  prices: {
    premium: { monthly: "pri_premium_m", yearly: "pri_premium_y" },
    pro: { monthly: "pri_pro_m", yearly: "pri_pro_y" },
  },
};
const USER = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const SECRET = "pdl_ntfset_secret";

function sign(body: string, ts: number, secret = SECRET) {
  return `ts=${ts};h1=${createHmac("sha256", secret).update(`${ts}:${body}`).digest("hex")}`;
}

function subscriptionEvent(
  overrides: Record<string, unknown> = {},
  type = "subscription.created",
) {
  return {
    event_type: type,
    occurred_at: "2026-11-15T10:00:00Z",
    data: {
      id: "sub_1",
      status: "active",
      customer_id: "ctm_1",
      updated_at: "2026-11-15T10:00:00Z",
      custom_data: { user_id: USER },
      items: [{ price: { id: "pri_premium_m" } }],
      current_billing_period: {
        starts_at: "2026-11-15T10:00:00Z",
        ends_at: "2026-12-15T10:00:00Z",
      },
      ...overrides,
    },
  };
}

describe("Paddle signatures", () => {
  const body = JSON.stringify({ hello: "world" });
  const now = 1_800_000_000_000;
  const ts = now / 1000;

  it("accepts a correctly signed, recent notification", () => {
    expect(verifyPaddleSignature(body, sign(body, ts), SECRET, now)).toBe(true);
  });
  it("refuses a changed body, a wrong secret, a missing header and garbage", () => {
    expect(verifyPaddleSignature(`${body} `, sign(body, ts), SECRET, now)).toBe(
      false,
    );
    expect(
      verifyPaddleSignature(body, sign(body, ts, "other"), SECRET, now),
    ).toBe(false);
    expect(verifyPaddleSignature(body, null, SECRET, now)).toBe(false);
    expect(verifyPaddleSignature(body, "ts=abc;h1=zz", SECRET, now)).toBe(
      false,
    );
    expect(verifyPaddleSignature(body, sign(body, ts), "", now)).toBe(false);
  });
  it("refuses an old notification replayed later", () => {
    expect(verifyPaddleSignature(body, sign(body, ts - 600), SECRET, now)).toBe(
      false,
    );
  });
});

describe("Paddle notifications", () => {
  it("gives the plan until the end of the period, with a short grace", () => {
    const change = paddleEventToChange(subscriptionEvent(), config);
    expect(change).toMatchObject({
      userId: USER,
      plan: "premium",
      status: "active",
      subscriptionId: "sub_1",
    });
    expect(change?.expiresAt).toBe("2026-12-17T10:00:00.000Z");
  });
  it("maps yearly and Pro prices", () => {
    expect(
      paddleEventToChange(
        subscriptionEvent({ items: [{ price: { id: "pri_pro_y" } }] }),
        config,
      )?.plan,
    ).toBe("pro");
    expect(planForPrice(config, "pri_premium_y")).toBe("premium");
    expect(planForPrice(config, "pri_other")).toBeNull();
  });
  it("ends the plan at once when canceled or paused", () => {
    const canceled = paddleEventToChange(
      subscriptionEvent(
        {
          status: "canceled",
          canceled_at: "2026-11-20T08:00:00Z",
          current_billing_period: null,
        },
        "subscription.canceled",
      ),
      config,
    );
    expect(canceled?.expiresAt).toBe("2026-11-20T08:00:00Z");
  });
  it("ignores other events, unknown prices and missing or invalid student ids", () => {
    expect(
      paddleEventToChange(
        { event_type: "transaction.completed", data: {} },
        config,
      ),
    ).toBeNull();
    expect(
      paddleEventToChange(
        subscriptionEvent({ items: [{ price: { id: "pri_other" } }] }),
        config,
      ),
    ).toBeNull();
    expect(
      paddleEventToChange(subscriptionEvent({ custom_data: null }), config),
    ).toBeNull();
    expect(
      paddleEventToChange(
        subscriptionEvent({ custom_data: { user_id: "not-a-uuid" } }),
        config,
      ),
    ).toBeNull();
    expect(paddleEventToChange("nonsense", config)).toBeNull();
  });
});

describe("applying changes in any order", () => {
  const change = (
    overrides: Partial<SubscriptionChange>,
  ): SubscriptionChange => ({
    userId: USER,
    plan: "premium",
    expiresAt: "2026-12-17T10:00:00Z",
    status: "active",
    provider: "paddle",
    customerId: "ctm_1",
    subscriptionId: "sub_1",
    changedAt: "2026-11-15T10:00:00Z",
    ...overrides,
  });

  it("saves the first change and newer ones", () => {
    expect(shouldApply(null, change({}))).toBe(true);
    expect(
      shouldApply(
        {
          subscriptionId: "sub_1",
          status: "active",
          changedAt: "2026-11-15T10:00:00Z",
        },
        change({ changedAt: "2026-12-15T10:00:00Z" }),
      ),
    ).toBe(true);
  });
  it("ignores an older notification that arrives late", () => {
    expect(
      shouldApply(
        {
          subscriptionId: "sub_1",
          status: "canceled",
          changedAt: "2026-11-20T00:00:00Z",
        },
        change({}),
      ),
    ).toBe(false);
  });
  it("never lets the end of an old subscription end a newer one", () => {
    const saved = {
      subscriptionId: "sub_2",
      status: "active",
      changedAt: "2026-11-10T00:00:00Z",
    };
    expect(
      shouldApply(
        saved,
        change({ status: "canceled", subscriptionId: "sub_1" }),
      ),
    ).toBe(false);
    expect(
      shouldApply(saved, change({ status: "active", subscriptionId: "sub_3" })),
    ).toBe(true);
  });
});
