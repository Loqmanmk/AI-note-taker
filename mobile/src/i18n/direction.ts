import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Updates from "expo-updates";
import { DevSettings, I18nManager, Platform } from "react-native";
import type { AppLanguage } from "./index";

/** Remembers a restart made to change direction, so a phone that ignores it never restarts in a loop. */
const RESTART_GUARD_KEY = "focusnotes.directionRestart.v1";

export function isRightToLeft(language: AppLanguage): boolean {
  return language === "ar";
}

/**
 * Lays the app out right to left for Arabic and left to right otherwise. On phones the direction
 * only changes when the app starts, so this restarts it once when needed.
 * Resolves with true when the app is restarting.
 */
export async function ensureLayoutDirection(language: AppLanguage): Promise<boolean> {
  const rtl = isRightToLeft(language);
  if (Platform.OS === "web") {
    if (typeof document !== "undefined") document.documentElement.dir = rtl ? "rtl" : "ltr";
    return false;
  }

  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
  if (I18nManager.isRTL === rtl) {
    AsyncStorage.removeItem(RESTART_GUARD_KEY).catch(() => {});
    return false;
  }

  try {
    if ((await AsyncStorage.getItem(RESTART_GUARD_KEY)) === language) return false; // Already tried: carry on.
    await AsyncStorage.setItem(RESTART_GUARD_KEY, language);
    if (__DEV__) DevSettings.reload();
    else await Updates.reloadAsync();
    return true;
  } catch {
    return false; // The new direction applies the next time the app starts.
  }
}
