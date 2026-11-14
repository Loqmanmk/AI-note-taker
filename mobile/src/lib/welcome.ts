import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "focusnotes.welcomeSeen.v1";
type Listener = () => void;

/** Whether the student has been through the welcome screens on this phone. */
class WelcomeStore {
  private seen: boolean | null = null;
  private readonly listeners = new Set<Listener>();

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Null until read from the phone. */
  getSnapshot = (): boolean | null => this.seen;

  async load() {
    if (this.seen !== null) return;
    let seen = false;
    try {
      seen = (await AsyncStorage.getItem(STORAGE_KEY)) === "1";
    } catch {
      // Unreadable storage: show the welcome again rather than block the app.
    }
    this.set(seen);
  }

  markSeen() {
    this.set(true);
    AsyncStorage.setItem(STORAGE_KEY, "1").catch(() => {});
  }

  private set(seen: boolean) {
    this.seen = seen;
    this.listeners.forEach((listener) => listener());
  }
}

export const welcomeStore = new WelcomeStore();
