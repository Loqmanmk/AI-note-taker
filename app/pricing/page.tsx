"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/hooks/useAuth";
import {
  PADDLE_SCRIPT_URL,
  initPaddle,
  openCheckout,
} from "@/lib/client/paddle";
import { getSupabase } from "@/lib/client/supabase";
import { LEGAL, PRIVACY_PATH, REFUND_PATH, TERMS_PATH } from "@/lib/legal";
import { SUBSCRIPTIONS_TABLE, readPlanStatus } from "@/lib/planStatus";
import {
  PLANS,
  PLAN_ORDER,
  YEARLY_MONTHS_CHARGED,
  type Billing,
  type PlanId,
  type PlanStatus,
} from "@/lib/plans";
import { readPaddlePublicConfig } from "@/lib/paymentsConfig";

const paddleConfig = readPaddlePublicConfig();
const RANK: Record<PlanId, number> = { free: 0, premium: 1, pro: 2 };

type Supabase = NonNullable<ReturnType<typeof getSupabase>>;

/** The plan and whether it was bought on Paddle (plans given by hand cannot be managed there). */
async function readAccountPlan(
  supabase: Supabase,
): Promise<{ status: PlanStatus; onPaddle: boolean }> {
  const [status, row] = await Promise.all([
    readPlanStatus(supabase),
    supabase.from(SUBSCRIPTIONS_TABLE).select("provider").maybeSingle(),
  ]);
  return { status, onPaddle: row.data?.provider === "paddle" };
}

function lengthLabel(minutes: number) {
  return minutes % 60 === 0
    ? `${minutes / 60} hour${minutes === 60 ? "" : "s"}`
    : `${minutes} minutes`;
}

function features(id: PlanId): string[] {
  const plan = PLANS[id];
  const classes =
    id === "pro"
      ? `${plan.classesPerMonth} classes a month (fair use)`
      : `${plan.classesPerMonth} classes a month`;
  const base = [
    classes,
    `Recordings up to ${lengthLabel(plan.maxRecordingMinutes)}`,
  ];
  if (id === "free")
    return [
      ...base,
      "Notes, focus topics and quiz",
      "“I’m lost” re-explanations",
    ];
  return [...base, `Everything in ${id === "premium" ? "Free" : "Premium"}`];
}

function price(id: PlanId, billing: Billing): string {
  const plan = PLANS[id];
  if (!plan.price) return "$0";
  const amount =
    plan.price.usdMonthly * (billing === "yearly" ? YEARLY_MONTHS_CHARGED : 1);
  return `$${amount.toFixed(2)}`;
}

/** Plans, prices and checkout on the website. Payments are handled by Paddle. */
export default function PricingPage() {
  const auth = useAuth();
  const [billing, setBilling] = useState<Billing>("monthly");
  const [status, setStatus] = useState<PlanStatus | null>(null);
  const [onPaddle, setOnPaddle] = useState(false);
  const [paddleReady, setPaddleReady] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async (): Promise<PlanStatus | null> => {
    const supabase = getSupabase();
    if (!supabase || !auth.session) return null;
    try {
      const next = await readAccountPlan(supabase);
      setStatus(next.status);
      setOnPaddle(next.onPaddle);
      return next.status;
    } catch {
      return null;
    }
  }, [auth.session]);

  // Reads the plan when the student signs in.
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !auth.session) return;
    let active = true;
    readAccountPlan(supabase)
      .then((next) => {
        if (!active) return;
        setStatus(next.status);
        setOnPaddle(next.onPaddle);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [auth.session]);

  /** After paying, Paddle tells our server within seconds: check until the new plan shows. */
  async function waitForUpgrade(from: PlanId) {
    setWaiting(true);
    setMessage("Payment received. Activating your plan…");
    for (let i = 0; i < 30; i++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const next = await refresh();
      if (next && RANK[next.plan] > RANK[from]) {
        setMessage(
          `You are on ${PLANS[next.plan].name}. Open the app: your new limits apply right away.`,
        );
        setWaiting(false);
        return;
      }
    }
    setMessage(
      "Your payment went through. Your plan can take a few minutes to activate: refresh this page shortly.",
    );
    setWaiting(false);
  }

  function buy(id: Exclude<PlanId, "free">) {
    if (!paddleConfig || !auth.session) return;
    setError("");
    const from = status?.plan ?? "free";
    openCheckout(
      paddleConfig.prices[id][billing],
      { id: auth.session.user.id, email: auth.session.user.email },
      () => {
        waitForUpgrade(from);
      },
    );
  }

  async function manage() {
    const supabase = getSupabase();
    const token = (await supabase?.auth.getSession())?.data.session
      ?.access_token;
    if (!token) return;
    setError("");
    try {
      const res = await fetch("/api/payments/portal", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !body.url)
        throw new Error(body.error ?? "Could not open your subscription page.");
      window.location.assign(body.url);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not open your subscription page.",
      );
    }
  }

  const current = status?.plan ?? "free";
  const signedIn = Boolean(auth.session);

  return (
    <main className="shell legal pricing">
      {paddleConfig && (
        <Script
          src={PADDLE_SCRIPT_URL}
          strategy="afterInteractive"
          onReady={() => setPaddleReady(initPaddle(paddleConfig))}
        />
      )}
      <AppHeader
        account={
          auth.session
            ? { email: auth.session.user.email ?? "", onSignOut: auth.signOut }
            : undefined
        }
      />
      <h1>Plans</h1>
      <p className="muted">
        Every plan writes the same notes: summary, focus topics, quiz and
        re-explanations. Paid plans give you more and longer classes. Prices in
        US dollars; the checkout shows the price in your currency, taxes
        included.
      </p>

      <div className="billing" role="tablist" aria-label="Billing period">
        {(["monthly", "yearly"] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={billing === option}
            className={billing === option ? "on" : ""}
            onClick={() => setBilling(option)}
          >
            {option === "monthly" ? "Monthly" : "Yearly · 2 months free"}
          </button>
        ))}
      </div>

      <div className="plans">
        {PLAN_ORDER.map((id) => {
          const isCurrent = signedIn && id === current;
          const canBuy = id !== "free" && RANK[id] > RANK[current];
          return (
            <section
              key={id}
              className={`card plan${id === "premium" ? " featured" : ""}`}
            >
              <div className="plan-top">
                <h2>{PLANS[id].name}</h2>
                {isCurrent ? (
                  <span className="badge good">Your plan</span>
                ) : id === "premium" ? (
                  <span className="badge">Most popular</span>
                ) : null}
              </div>
              <p className="price">
                {price(id, billing)}
                <span> / {billing === "yearly" ? "year" : "month"}</span>
              </p>
              <ul>
                {features(id).map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              {id !== "free" &&
                (!paddleConfig ? (
                  <p className="muted">Coming soon.</p>
                ) : !signedIn ? null : canBuy ? (
                  <button
                    type="button"
                    className="btn primary"
                    disabled={!paddleReady || waiting}
                    onClick={() => buy(id)}
                  >
                    {current === "free"
                      ? `Get ${PLANS[id].name}`
                      : `Switch to ${PLANS[id].name}`}
                  </button>
                ) : null)}
            </section>
          );
        })}
      </div>

      {auth.enabled && !auth.loading && !signedIn && (
        <div className="signin-box">
          <p>
            Sign in with the Google account you use in the app, so your plan
            applies there.
          </p>
          <button
            type="button"
            className="btn primary google"
            onClick={auth.signIn}
          >
            <span aria-hidden="true" className="g">
              G
            </span>
            Continue with Google
          </button>
        </div>
      )}

      {signedIn && current !== "free" && onPaddle && paddleConfig && (
        <p>
          <button type="button" className="btn" onClick={manage}>
            Manage my subscription
          </button>{" "}
          <span className="muted">
            Cancel, switch plan or change your card.
          </span>
        </p>
      )}

      {message && (
        <p role="status" className="status">
          {message}
        </p>
      )}
      {(error || auth.error) && (
        <p role="alert" className="warn">
          {error || auth.error}
        </p>
      )}

      <p className="muted small">
        Payments are processed by Paddle, our reseller, who handles your card
        and taxes. Subscriptions renew automatically until you cancel; you keep
        your plan until the end of the period you paid for. Classes reset on the
        1st of each month. You can ask for a refund within {LEGAL.refundDays}{" "}
        days of your first payment: see our{" "}
        <Link href={REFUND_PATH}>refund policy</Link>,{" "}
        <Link href={TERMS_PATH}>terms of service</Link> and{" "}
        <Link href={PRIVACY_PATH}>privacy policy</Link>.
      </p>
    </main>
  );
}
