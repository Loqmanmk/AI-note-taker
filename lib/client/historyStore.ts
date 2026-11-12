import { z } from "zod";
import { HISTORY_MAX_ITEMS } from "../constants";
import { SavedClassSchema, type SavedClass } from "../schema";

const STORAGE_KEY = "focusnotes.history.v1";
const EMPTY: SavedClass[] = [];

type Listener = () => void;

/**
 * Past classes, stored in the browser.
 * Shaped as an external store so React can subscribe with useSyncExternalStore.
 */
class HistoryStore {
  private cache: SavedClass[] | null = null;
  private readonly listeners = new Set<Listener>();

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): SavedClass[] => {
    this.cache ??= this.read();
    return this.cache;
  };

  getServerSnapshot = (): SavedClass[] => EMPTY;

  add(item: SavedClass) {
    this.write([item, ...this.getSnapshot()].slice(0, HISTORY_MAX_ITEMS));
  }

  remove(id: string) {
    this.write(this.getSnapshot().filter((item) => item.id !== id));
  }

  private read(): SavedClass[] {
    try {
      // Stored data may be from an older version or edited by hand: validate it.
      const parsed = z.array(SavedClassSchema).safeParse(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"));
      return parsed.success ? parsed.data : EMPTY;
    } catch {
      return EMPTY;
    }
  }

  private write(items: SavedClass[]) {
    this.cache = items;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage full or blocked (private mode): keep working for this visit.
    }
    this.listeners.forEach((listener) => listener());
  }
}

export const historyStore = new HistoryStore();
