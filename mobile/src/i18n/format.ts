import { formatRelativeDay } from "@shared/format";
import { PLANS, nextMonthStart, type Plan, type PlanId } from "@shared/plans";
import { currentLocale, type Messages } from "./index";

/** "Today", "Yesterday", a weekday, or a date, in the app's language. */
export function relativeDay(iso: string, m: Messages): string {
  return formatRelativeDay(iso, new Date(), currentLocale(), { today: m.common.today, yesterday: m.common.yesterday });
}

/** "30 minutes", "2 hours". */
export function formatLength(minutes: number, m: Messages): string {
  return minutes % 60 === 0 ? m.duration.hours(minutes / 60) : m.duration.minutes(minutes);
}

/** "1 December": when the month's classes come back. */
export function resetDate(): string {
  return nextMonthStart().toLocaleDateString(currentLocale(), { day: "numeric", month: "long" });
}

export function planName(id: PlanId, m: Messages): string {
  return m.plans.names[id];
}

/** What a plan includes, in the app's language. */
export function planFeatures(plan: Plan, m: Messages): string[] {
  const f = m.plans.features;
  const length = f.length(formatLength(plan.maxRecordingMinutes, m));
  if (plan.id === "free") return [f.classes(plan.classesPerMonth), length, f.notes, f.lost];
  if (plan.id === "premium") return [f.classes(plan.classesPerMonth), length, f.everythingIn(planName("free", m))];
  return [f.fairUse(plan.classesPerMonth), length, f.everythingIn(planName("premium", m))];
}

export { PLANS };
