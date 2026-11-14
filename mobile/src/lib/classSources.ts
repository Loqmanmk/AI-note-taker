import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  CLASSES_TABLE,
  CLASS_COLUMNS,
  CLASS_LIST_LIMIT,
  rowsToPendingClasses,
  rowsToSavedClasses,
  type PendingClass,
} from "@shared/classes";
import { HISTORY_MAX_ITEMS } from "@shared/constants";
import { SavedClassSchema, type SavedClass } from "@shared/schema";
import { t } from "@/i18n";

/** Where a student's past classes are kept. */
export interface ClassSource {
  load(): Promise<SavedClass[]>;
  /** Called after a new class is shown. The account source has nothing to do: the server saved it. */
  added(items: SavedClass[]): Promise<void>;
  remove(id: string, remaining: SavedClass[]): Promise<void>;
}

/** On this phone only. Used when accounts are not set up. */
export class LocalClassSource implements ClassSource {
  private static readonly KEY = "focusnotes.history.v1";

  async load(): Promise<SavedClass[]> {
    try {
      // Stored data may come from an older version of the app: validate it.
      const raw = await AsyncStorage.getItem(LocalClassSource.KEY);
      const parsed = z.array(SavedClassSchema).safeParse(JSON.parse(raw ?? "[]"));
      return parsed.success ? parsed.data : [];
    } catch {
      return [];
    }
  }

  async added(items: SavedClass[]): Promise<void> {
    await this.write(items);
  }

  async remove(_id: string, remaining: SavedClass[]): Promise<void> {
    await this.write(remaining);
  }

  private async write(items: SavedClass[]) {
    try {
      await AsyncStorage.setItem(LocalClassSource.KEY, JSON.stringify(items.slice(0, HISTORY_MAX_ITEMS)));
    } catch {
      // Storage full: the class stays available until the app closes.
    }
  }
}

/** In the signed-in student's account. The database only returns and deletes their own classes. */
export class AccountClassSource implements ClassSource {
  constructor(private readonly supabase: SupabaseClient) {}

  async load(): Promise<SavedClass[]> {
    const { data, error } = await this.supabase
      .from(CLASSES_TABLE)
      .select(CLASS_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(CLASS_LIST_LIMIT);
    if (error) throw new Error("Could not load your classes.");
    return rowsToSavedClasses(data);
  }

  async added(): Promise<void> {}

  /** The current state of classes whose notes are being written. */
  async check(ids: string[]): Promise<{ ready: SavedClass[]; pending: PendingClass[] }> {
    const { data, error } = await this.supabase.from(CLASSES_TABLE).select(CLASS_COLUMNS).in("id", ids);
    if (error) throw new Error("Could not check your classes.");
    return { ready: rowsToSavedClasses(data), pending: rowsToPendingClasses(data) };
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.from(CLASSES_TABLE).delete().eq("id", id);
    if (error) throw new Error(t().history.deleteFailed);
  }
}
