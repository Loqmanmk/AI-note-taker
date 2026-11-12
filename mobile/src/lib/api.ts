import Constants from "expo-constants";
import { File as LocalFile } from "expo-file-system";
import { Platform } from "react-native";
import type { NoteLanguage } from "@shared/constants";
import { NotesResponseSchema, type NotesResponse } from "@shared/schema";

const SERVER_PORT = 3000;
const HEALTH_TIMEOUT_MS = 5000;

/**
 * Where the FocusNotes server is.
 * In development the phone already talks to the computer that runs Expo, and
 * the server runs on that same computer, so its address can be reused.
 */
export function getApiBaseUrl(): string | undefined {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  const devHost = Constants.expoConfig?.hostUri?.split(":")[0];
  return devHost ? `http://${devHost}:${SERVER_PORT}` : undefined;
}

export type Recording = { uri: string; lostTimes: number[] };

/** Whether the server answers at all. Used to tell "no connection" apart from "this request failed". */
export async function isServerReachable(): Promise<boolean> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) return false;
  // AbortSignal.timeout is not available in every React Native version.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl}/api/health`, { signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Throws an Error whose message is safe to show the student. */
async function postForStudyPack(path: string, init: RequestInit): Promise<NotesResponse> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) throw new Error("The server address is not set. Add EXPO_PUBLIC_API_URL to mobile/.env.");

  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, { method: "POST", ...init });
  } catch (err) {
    // Shown in the Expo terminal on the computer, so the real cause can be diagnosed.
    console.warn(`[api] ${path} failed:`, err);
    // Naming the address lets the student test it in the phone's browser.
    throw new Error(
      `Could not reach the server at ${baseUrl}. Check that the server is running on your computer, ` +
        "then open that address in your phone's browser to test the connection.",
    );
  }

  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data as { error?: unknown } | null)?.error;
    throw new Error(typeof message === "string" ? message : "Something went wrong. Try again.");
  }

  const parsed = NotesResponseSchema.safeParse(data);
  if (!parsed.success) throw new Error("The server sent an answer the app could not read.");
  return parsed.data;
}

/** Attaches the recorded file to a form in the way each platform expects. */
async function appendRecording(form: FormData, uri: string) {
  if (Platform.OS === "web") {
    // In a browser the recording is an in-memory blob behind a blob: URL.
    const blob = await (await fetch(uri)).blob();
    form.append("audio", blob, "class.webm");
    return;
  }
  // Expo's fetch reads the file from its bytes; it does not accept React Native's
  // { uri, name, type } objects. The server also recognises the type from the .m4a name.
  const file = new LocalFile(uri);
  if (!file.exists) throw new Error("The recording could not be found on the phone. Record the class again.");
  form.append("audio", file);
}

export async function requestStudyPackFromRecording(
  recording: Recording,
  language: NoteLanguage,
): Promise<NotesResponse> {
  const form = new FormData();
  await appendRecording(form, recording.uri);
  form.append("language", language);
  form.append("lostTimes", JSON.stringify(recording.lostTimes));
  return postForStudyPack("/api/notes/audio", { body: form });
}

export function requestStudyPackFromTranscript(transcript: string, language: NoteLanguage): Promise<NotesResponse> {
  return postForStudyPack("/api/notes", {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript, language }),
  });
}
