import { describe, expect, it } from "vitest";
import { PLANS, checkAllowance, effectivePlan, nextMonthStart, planPrice, startOfMonth, type PlanStatus } from "../lib/plans";

const status = (plan: PlanStatus["plan"], classesUsed: number): PlanStatus => ({
  plan,
  classesUsed,
  classesPerMonth: PLANS[plan].classesPerMonth,
  maxRecordingMinutes: PLANS[plan].maxRecordingMinutes,
});

describe("effectivePlan", () => {
  const now = new Date("2026-11-14T12:00:00Z");
  it("is Free without a subscription or with an unknown plan", () => {
    expect(effectivePlan(null, now)).toBe("free");
    expect(effectivePlan({ plan: "gold", expires_at: null }, now)).toBe("free");
  });
  it("keeps a paid plan until it expires", () => {
    expect(effectivePlan({ plan: "premium", expires_at: "2026-12-01T00:00:00Z" }, now)).toBe("premium");
    expect(effectivePlan({ plan: "pro", expires_at: null }, now)).toBe("pro");
    expect(effectivePlan({ plan: "premium", expires_at: "2026-11-01T00:00:00Z" }, now)).toBe("free");
  });
});

describe("checkAllowance", () => {
  it("allows a class within the plan", () => {
    expect(checkAllowance(status("free", 2), 25 * 60)).toEqual({ ok: true });
  });
  it("stops at the monthly limit", () => {
    expect(checkAllowance(status("free", 3), 60)).toMatchObject({ ok: false, reason: "monthly_limit" });
    expect(checkAllowance(status("premium", 30), 60)).toMatchObject({ ok: false, reason: "monthly_limit" });
  });
  it("refuses recordings longer than the plan allows, with a little leeway", () => {
    expect(checkAllowance(status("free", 0), 32 * 60)).toEqual({ ok: true });
    expect(checkAllowance(status("free", 0), 40 * 60)).toMatchObject({ ok: false, reason: "too_long" });
    expect(checkAllowance(status("premium", 0), 110 * 60)).toEqual({ ok: true });
  });
});

describe("helpers", () => {
  it("starts the month on the 1st in UTC", () => {
    expect(startOfMonth(new Date("2026-11-14T23:30:00Z")).toISOString()).toBe("2026-11-01T00:00:00.000Z");
  });
  it("resets on the 1st of next month, including in December", () => {
    expect(nextMonthStart(new Date("2026-12-31T10:00:00Z")).toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });
  it("prices a year as ten months", () => {
    expect(planPrice(PLANS.free, "monthly")).toBeNull();
    expect(planPrice(PLANS.premium, "monthly")).toEqual({ mad: 49, usd: 4.99 });
    expect(planPrice(PLANS.premium, "yearly")).toEqual({ mad: 490, usd: 49.9 });
    expect(planPrice(PLANS.pro, "yearly")).toEqual({ mad: 890, usd: 89.9 });
  });
});
