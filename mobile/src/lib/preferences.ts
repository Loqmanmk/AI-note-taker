import AsyncStorage from "@react-native-async-storage/async-storage";
import { NOTE_LANGUAGE_CODES, type NoteLanguage } from "@shared/constants";

const NOTE_LANGUAGE_KEY = "focusnotes.noteLanguage.v1";

/** The notes language the student picked last time, or "auto". */
export async function loadNoteLanguage(): Promise<NoteLanguage> {
  try {
    const stored = await AsyncStorage.getItem(NOTE_LANGUAGE_KEY);
    return NOTE_LANGUAGE_CODES.find((code) => code === stored) ?? "auto";
  } catch {
    return "auto";
  }
}

export function saveNoteLanguage(language: NoteLanguage): void {
  AsyncStorage.setItem(NOTE_LANGUAGE_KEY, language).catch(() => {
    // Not remembering the choice is harmless.
  });
}
