/** The plans students can be on. The server enforces the limits; the apps only display them. */
export type PlanId = "free" | "premium" | "pro";

export type Plan = {
  id: PlanId;
  name: string;
  classesPerMonth: number;
  /** Longest recording the plan accepts. */
  maxRecordingMinutes: number;
  /** Displayed prices; the real price is set in the store, which can adapt it per country. */
  price: { usdMonthly: number; madMonthly: number } | null;
  features: string[];
};

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    classesPerMonth: 3,
    maxRecordingMinutes: 30,
    price: null,
    features: ["3 classes a month", "Recordings up to 30 minutes", "Notes, focus topics and quiz", "“I’m lost” re-explanations"],
  },
  premium: {
    id: "premium",
    name: "Premium",
    classesPerMonth: 30,
    maxRecordingMinutes: 120,
    price: { usdMonthly: 4.99, madMonthly: 49 },
    features: ["30 classes a month", "Recordings up to 2 hours", "Everything in Free"],
  },
  pro: {
    id: "pro",
    name: "Pro",
    classesPerMonth: 100,
    maxRecordingMinutes: 180,
    price: { usdMonthly: 8.99, madMonthly: 89 },
    features: ["100 classes a month (fair use)", "Recordings up to 3 hours", "Everything in Premium"],
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "premium", "pro"];
/** Yearly plans cost ten months: two months free. */
export const YEARLY_MONTHS_CHARGED = 10;

export type Billing = "monthly" | "yearly";

/** What a plan costs per billing period, in dirhams and dollars. Null for Free. */
export function planPrice(plan: Plan, billing: Billing): { mad: number; usd: number } | null {
  if (!plan.price) return null;
  const months = billing === "yearly" ? YEARLY_MONTHS_CHARGED : 1;
  return { mad: plan.price.madMonthly * months, usd: Math.round(plan.price.usdMonthly * months * 100) / 100 };
}

/** When the monthly classes come back. */
export function nextMonthStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

/** The plan in force: a paid plan only counts until it expires. */
export function effectivePlan(row: { plan: string; expires_at: string | null } | null, now = new Date()): PlanId {
  if (!row || !(row.plan in PLANS)) return "free";
  if (row.expires_at && new Date(row.expires_at).getTime() <= now.getTime()) return "free";
  return row.plan as PlanId;
}

/** Limits reset on the first day of each month, in UTC. */
export function startOfMonth(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export type PlanStatus = {
  plan: PlanId;
  classesUsed: number;
  classesPerMonth: number;
  maxRecordingMinutes: number;
};

export type Allowance =
  | { ok: true }
  | { ok: false; reason: "monthly_limit" | "too_long"; message: string };

/** Whether a new class may be created under the student's plan. */
export function checkAllowance(status: PlanStatus, recordingSeconds: number): Allowance {
  const plan = PLANS[status.plan];
  if (status.classesUsed >= status.classesPerMonth) {
    return {
      ok: false,
      reason: "monthly_limit",
      message:
        status.plan === "pro"
          ? `You have used your ${plan.classesPerMonth} classes this month. They come back on the 1st.`
          : `You have used your ${plan.classesPerMonth} ${plan.name} classes this month. Upgrade to keep going.`,
    };
  }
  // Leeway, since the length is estimated from the file size.
  if (recordingSeconds > status.maxRecordingMinutes * 60 * 1.1) {
    return {
      ok: false,
      reason: "too_long",
      message: `${plan.name} accepts recordings up to ${formatMinutes(status.maxRecordingMinutes)}. Upgrade for longer classes.`,
    };
  }
  return { ok: true };
}

export function formatMinutes(minutes: number): string {
  return minutes % 60 === 0 ? `${minutes / 60} hour${minutes === 60 ? "" : "s"}` : `${minutes} minutes`;
}

/** The phone records at about 32 kbit/s, so the size gives an estimate of the length. */
export const RECORDING_BYTES_PER_SECOND = 4000;
