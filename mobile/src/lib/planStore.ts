import { AppState } from "react-native";
import { readPlanStatus } from "@shared/planStatus";
import type { PlanStatus } from "@shared/plans";
import { supabase } from "./supabase";

type Listener = () => void;

/**
 * The signed-in student's plan and this month's usage, for display. The server enforces the
 * limits on its own; this only lets the app explain them and stop a recording at the right time.
 */
class PlanStore {
  private status: PlanStatus | null = null;
  private readonly listeners = new Set<Listener>();
  private appStateSubscription: { remove: () => void } | undefined;
  private generation = 0;

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    // Usage changes while the app is away (a class finished, a plan was bought): check on return.
    this.appStateSubscription ??= AppState.addEventListener("change", (state) => {
      if (state === "active") this.refresh();
    });
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.appStateSubscription?.remove();
        this.appStateSubscription = undefined;
      }
    };
  };

  getSnapshot = (): PlanStatus | null => this.status;

  /** Reads the plan again. Without accounts, or when offline, the last known status stays. */
  refresh = async () => {
    if (!supabase) return;
    const generation = ++this.generation;
    const { data } = await supabase.auth.getSession();
    if (!data.session) return this.set(null);
    try {
      // The shared code is typed against the website's copy of supabase-js; the API is the same.
      const status = await readPlanStatus(supabase as unknown as Parameters<typeof readPlanStatus>[0]);
      // A slower, older answer must not replace a newer one.
      if (generation === this.generation) this.set(status);
    } catch {
      // Offline or the plans are not set up yet: the server still decides.
    }
  };

  /** Forgets the status, for example when the student signs out. */
  clear() {
    this.generation++;
    this.set(null);
  }

  private set(status: PlanStatus | null) {
    this.status = status;
    this.listeners.forEach((listener) => listener());
  }
}

export const planStore = new PlanStore();
