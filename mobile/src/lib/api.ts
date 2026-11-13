import Constants from "expo-constants";
import { randomUUID } from "expo-crypto";
import { File as LocalFile } from "expo-file-system";
import { Platform } from "react-native";
import { AUDIO_MAX_BYTES, type NoteLanguage } from "@shared/constants";
import { RECORDINGS_BUCKET, recordingPath } from "@shared/recordings";
import { NotesResponseSchema, type NotesResponse } from "@shared/schema";
import { getAccessToken, supabase } from "./supabase";

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

  // Proves to the server which student is asking.
  const token = await getAccessToken();
  const headers = { ...(init.headers as Record<string, string> | undefined), ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, { method: "POST", ...init, headers });
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
    // The session ended: signing out brings the student back to the sign-in screen.
    if (res.status === 401) await supabase?.auth.signOut();
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

const TOO_LONG = "The recording is too long. Split the class into two parts.";

/** The recording's bytes, wherever the platform keeps it. */
async function readRecording(uri: string): Promise<Uint8Array> {
  if (Platform.OS === "web") return new Uint8Array(await (await fetch(uri)).arrayBuffer());
  const file = new LocalFile(uri);
  if (!file.exists) throw new Error("The recording could not be found on the phone. Record the class again.");
  if (file.size > AUDIO_MAX_BYTES) throw new Error(TOO_LONG);
  return file.bytes();
}

/**
 * Uploads the recording to the student's private storage folder and returns its path.
 * Recordings go there rather than to the server, because hosting platforms cap request size
 * (Vercel: 4.5 MB) while an hour of class is about 15 MB. The server deletes it once used.
 */
async function uploadRecording(uri: string): Promise<string> {
  if (!supabase) throw new Error("Accounts are not set up.");
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) throw new Error("Your session has expired. Sign in again.");

  const bytes = await readRecording(uri);
  const extension = Platform.OS === "web" ? "webm" : "m4a";
  const path = recordingPath(userId, randomUUID(), extension);
  const { error } = await supabase.storage.from(RECORDINGS_BUCKET).upload(path, bytes, {
    contentType: Platform.OS === "web" ? "audio/webm" : "audio/mp4",
    upsert: false,
  });
  if (error) {
    console.warn("[api] recording upload failed:", error.message);
    throw new Error("Could not upload the recording. Check your connection and try again.");
  }
  return path;
}

export async function requestStudyPackFromRecording(
  recording: Recording,
  language: NoteLanguage,
): Promise<NotesResponse> {
  // With accounts, the recording goes to storage and the server receives only where it is.
  if (supabase) {
    const path = await uploadRecording(recording.uri);
    return postForStudyPack("/api/notes/audio", {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recordingPath: path, language, lostTimes: recording.lostTimes }),
    });
  }

  // Without accounts (a local server), the recording is sent to the server directly.
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
