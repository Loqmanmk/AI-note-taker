import "server-only";
import { z } from "zod";
import { serviceClient } from "./serviceClient";

export const APP_SETTINGS_TABLE = "app_settings";

/** Switches an admin can flip without a new deploy. */
export const AppSettingsSchema = z.object({
  /** New notes are refused with a clear message, for example during an incident. */
  maintenance: z.boolean(),
  /** Recordings are transcribed (Groq) before Gemini writes the notes. Off: Gemini listens to the audio. */
  transcription: z.boolean(),
});
export type AppSettings = z.infer<typeof AppSettingsSchema>;
export type AppSettingKey = keyof AppSettings;

export const DEFAULT_SETTINGS: AppSettings = {
  maintenance: false,
  transcription: true,
};

/** Settings are read at most every 20 seconds per server instance. */
const CACHE_MS = 20_000;
let cached: { at: number; value: AppSettings } | undefined;

/** The current settings. If they cannot be read, the defaults apply so the app keeps working. */
export async function getAppSettings(): Promise<AppSettings> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;
  const client = serviceClient();
  let value = DEFAULT_SETTINGS;
  if (client) {
    const { data, error } = await client
      .from(APP_SETTINGS_TABLE)
      .select("key, value");
    if (error)
      console.error(
        "[settings] could not read the settings; using defaults",
        error.message,
      );
    else {
      const stored = Object.fromEntries(
        (data ?? []).map((row) => [row.key, row.value]),
      );
      const parsed = AppSettingsSchema.partial().safeParse(stored);
      value = { ...DEFAULT_SETTINGS, ...(parsed.success ? parsed.data : {}) };
    }
  }
  cached = { at: Date.now(), value };
  return value;
}

export async function setAppSetting(
  key: AppSettingKey,
  value: boolean,
  adminEmail: string,
): Promise<void> {
  const client = serviceClient();
  if (!client) throw new Error("The Supabase secret key is not configured.");
  const { error } = await client
    .from(APP_SETTINGS_TABLE)
    .upsert({
      key,
      value,
      updated_at: new Date().toISOString(),
      updated_by: adminEmail,
    });
  if (error) throw new Error(`Could not save the setting: ${error.message}`);
  cached = undefined;
}
