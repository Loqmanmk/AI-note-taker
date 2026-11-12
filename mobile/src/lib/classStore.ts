import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";
import { HISTORY_MAX_ITEMS } from "@shared/constants";
import { SavedClassSchema, type SavedClass } from "@shared/schema";

const STORAGE_KEY = "focusnotes.history.v1";
const EMPTY: SavedClass[] = [];

type Listener = () => void;

/**
 * Past classes, stored on the phone.
 * Shaped as an external store so React can subscribe with useSyncExternalStore.
 */
class ClassStore {
  private saved: SavedClass[] = EMPTY;
  /** Classes shown this session but not kept, such as demo results. */
  private readonly unsaved = new Map<string, SavedClass>();
  private readonly listeners = new Set<Listener>();
  private loading: Promise<void> | undefined;

  subscribe = (listener: Listener) => {
    this.load();
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): SavedClass[] => this.saved;

  find(id: string): SavedClass | undefined {
    return this.unsaved.get(id) ?? this.saved.find((item) => item.id === id);
  }

  /** Keeps a class so it can be opened. Demo results are not written to storage. */
  add(item: SavedClass) {
    if (item.demo) {
      this.unsaved.set(item.id, item);
      return;
    }
    this.write([item, ...this.saved].slice(0, HISTORY_MAX_ITEMS));
  }

  remove(id: string) {
    this.write(this.saved.filter((item) => item.id !== id));
  }

  private load(): Promise<void> {
    this.loading ??= AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        // Stored data may come from an older version of the app: validate it.
        const parsed = z.array(SavedClassSchema).safeParse(JSON.parse(raw ?? "[]"));
        if (parsed.success && parsed.data.length) {
          this.saved = parsed.data;
          this.notify();
        }
      })
      .catch(() => {
        // Unreadable history is not worth blocking the app for.
      });
    return this.loading;
  }

  private write(items: SavedClass[]) {
    this.saved = items;
    this.notify();
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items)).catch(() => {
      // Storage full: the class stays available until the app closes.
    });
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }
}

export const classStore = new ClassStore();
