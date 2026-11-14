import { useEffect, useSyncExternalStore } from "react";
import { planStore } from "@/lib/planStore";

/** The student's plan and usage this month; null until known, or when accounts are off. */
export function usePlan() {
  const status = useSyncExternalStore(planStore.subscribe, planStore.getSnapshot, planStore.getSnapshot);
  useEffect(() => {
    planStore.refresh();
  }, []);
  const limitReached = status !== null && status.classesUsed >= status.classesPerMonth;
  return { status, limitReached, refresh: planStore.refresh };
}
