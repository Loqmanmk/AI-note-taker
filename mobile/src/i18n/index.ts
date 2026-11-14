import { useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ar } from "./ar";
import { en, type Messages } from "./en";
import { fr } from "./fr";

export type { Messages } from "./en";

export type AppLanguage = "en" | "fr" | "ar";

/** The languages of the app's screens, each named in its own language. */
export const APP_LANGUAGES: { code: AppLanguage; name: string }[] = [
  { code: "en", name: "English" },
  { code: "fr", name: "Français" },
  { code: "ar", name: "العربية" },
];

const MESSAGES: Record<AppLanguage, Messages> = { en, fr, ar };

/** For dates and numbers. Moroccan Arabic keeps Western digits, as students are used to. */
const LOCALES: Record<AppLanguage, string> = { en: "en-US", fr: "fr-FR", ar: "ar-MA" };

const STORAGE_KEY = "focusnotes.appLanguage.v1";

/** The phone's language when the app has it, otherwise English. */
export function deviceLanguage(): AppLanguage {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase();
    if (locale.startsWith("fr")) return "fr";
    if (locale.startsWith("ar")) return "ar";
  } catch {
    // Without Intl, English.
  }
  return "en";
}

function isAppLanguage(value: unknown): value is AppLanguage {
  return value === "en" || value === "fr" || value === "ar";
}

type Listener = () => void;

/** The language of the screens: the student's choice, or the phone's language. */
class LanguageStore {
  /** Null follows the phone. */
  private choice: AppLanguage | null = null;
  private current: AppLanguage = deviceLanguage();
  private readonly listeners = new Set<Listener>();
  private loaded: Promise<AppLanguage> | undefined;

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): AppLanguage => this.current;
  getChoice = (): AppLanguage | null => this.choice;

  /** Reads the saved choice once. Resolves with the language to use. */
  load(): Promise<AppLanguage> {
    this.loaded ??= AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (isAppLanguage(saved)) this.apply(saved);
        return this.current;
      })
      .catch(() => this.current);
    return this.loaded;
  }

  /** Saves the student's choice; null goes back to the phone's language. */
  async choose(choice: AppLanguage | null): Promise<AppLanguage> {
    this.apply(choice);
    try {
      if (choice) await AsyncStorage.setItem(STORAGE_KEY, choice);
      else await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      // The choice still applies until the app closes.
    }
    return this.current;
  }

  private apply(choice: AppLanguage | null) {
    this.choice = choice;
    this.current = choice ?? deviceLanguage();
    this.listeners.forEach((listener) => listener());
  }
}

export const languageStore = new LanguageStore();

/** The texts in the current language, for code outside React components (alerts, notifications, errors). */
export function t(): Messages {
  return MESSAGES[languageStore.getSnapshot()];
}

export function currentLocale(): string {
  return LOCALES[languageStore.getSnapshot()];
}

/** The texts in the current language; the component updates when the language changes. */
export function useT(): Messages {
  return MESSAGES[useLanguage()];
}

export function useLanguage(): AppLanguage {
  return useSyncExternalStore(languageStore.subscribe, languageStore.getSnapshot, languageStore.getSnapshot);
}
