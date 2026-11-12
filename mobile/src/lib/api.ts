import Constants from "expo-constants";
import { Platform } from "react-native";
import type { NoteLanguage } from "@shared/constants";
import { NotesResponseSchema, type NotesResponse } from "@shared/schema";

const SERVER_PORT = 3000;
const GENERIC_ERROR = "Could not reach the server. Check that your phone and computer are on the same Wi-Fi.";

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

/** Throws an Error whose message is safe to show the student. */
async function postForStudyPack(path: string, init: RequestInit): Promise<NotesResponse> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) throw new Error("The server address is not set. Add EXPO_PUBLIC_API_URL to mobile/.env.");

  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, { method: "POST", ...init });
  } catch {
    throw new Error(GENERIC_ERROR);
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
  // React Native uploads a local file when given its uri, name and type.
  form.append("audio", { uri, name: "class.m4a", type: "audio/mp4" } as unknown as Blob);
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
