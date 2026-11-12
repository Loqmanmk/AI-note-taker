import type { SavedClass } from "@shared/schema";
import type { ClassSource } from "./classSources";

export type ClassListStatus = "idle" | "loading" | "ready" | "error";
export type ClassListState = { items: SavedClass[]; status: ClassListStatus };

type Listener = () => void;

const IDLE: ClassListState = { items: [], status: "idle" };

/**
 * The student's past classes, from whichever source is active.
 * Shaped as an external store so React can subscribe with useSyncExternalStore.
 */
class ClassStore {
  private state: ClassListState = IDLE;
  private source: ClassSource | null = null;
  /** Classes shown this session but not kept, such as demo results. */
  private readonly unsaved = new Map<string, SavedClass>();
  private readonly listeners = new Set<Listener>();
  /** Bumped when the source changes, so a late answer from the old source is ignored. */
  private generation = 0;

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): ClassListState => this.state;

  /** Switches to another source (or none, when signed out) and loads its classes. */
  setSource(source: ClassSource | null) {
    this.source = source;
    this.unsaved.clear();
    this.generation += 1;
    this.set(source ? { items: [], status: "loading" } : IDLE);
    if (source) this.reload();
  }

  async reload() {
    const source = this.source;
    if (!source) return;
    const generation = this.generation;
    this.set({ items: this.state.items, status: "loading" });
    try {
      const items = await source.load();
      if (generation === this.generation) this.set({ items, status: "ready" });
    } catch {
      if (generation === this.generation) this.set({ items: this.state.items, status: "error" });
    }
  }

  find(id: string): SavedClass | undefined {
    return this.unsaved.get(id) ?? this.state.items.find((item) => item.id === id);
  }

  /** Shows a new class. Demo results are kept for this session only. */
  add(item: SavedClass) {
    if (item.demo) {
      this.unsaved.set(item.id, item);
      return;
    }
    const items = [item, ...this.state.items.filter((existing) => existing.id !== item.id)];
    this.set({ items, status: this.state.status === "error" ? "ready" : this.state.status });
    this.source?.added(items).catch(() => {});
  }

  /** Throws an Error safe to show when the class could not be deleted. */
  async remove(id: string) {
    const remaining = this.state.items.filter((item) => item.id !== id);
    await this.source?.remove(id, remaining);
    this.set({ ...this.state, items: this.state.items.filter((item) => item.id !== id) });
  }

  private set(next: ClassListState) {
    this.state = next;
    this.listeners.forEach((listener) => listener());
  }
}

export const classStore = new ClassStore();
