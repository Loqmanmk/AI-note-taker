import Constants from "expo-constants";
import { randomUUID } from "expo-crypto";
import { File as LocalFile } from "expo-file-system";
import { Platform } from "react-native";
import { AUDIO_MAX_BYTES, type NoteLanguage } from "@shared/constants";
import { RECORDINGS_BUCKET, recordingPath } from "@shared/recordings";
import { z } from "zod";
import {
  NotesJobResponseSchema,
  NotesResponseSchema,
  type NotesJobResponse,
  type NotesResponse,
} from "@shared/schema";
import { getAccessToken, supabase } from "./supabase";
import { languageStore, t } from "@/i18n";

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

type ServerAnswer = { status: number; data: unknown; isJson: boolean };

/** Sends one request; throws an Error safe to show when the server cannot be reached. */
async function send(baseUrl: string, path: string, init: RequestInit, token: string | undefined): Promise<ServerAnswer> {
  const headers = {
    ...(init.headers as Record<string, string> | undefined),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    // The server answers errors in the app's language.
    "Accept-Language": languageStore.getSnapshot(),
  };
  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, { method: "POST", ...init, headers });
  } catch (err) {
    console.warn(`[api] ${path} failed:`, err);
    throw new ConnectionError(t().api.unreachable(baseUrl));
  }
  const text = await res.text().catch(() => "");
  try {
    return { status: res.status, data: JSON.parse(text), isJson: true };
  } catch {
    return { status: res.status, data: text.slice(0, 300), isJson: false };
  }
}

function errorMessage(data: unknown): string | undefined {
  const message = (data as { error?: unknown } | null)?.error;
  return typeof message === "string" ? message : undefined;
}

/** Throws an Error whose message is safe to show the student. */
async function postForStudyPack(path: string, init: RequestInit): Promise<NotesResponse> {
  return postAndParse(path, init, NotesResponseSchema);
}

/** The server could not be reached, or the upload broke off: worth retrying on its own. */
export class ConnectionError extends Error {
  override name = "ConnectionError";
}

/** The student's plan does not allow this class. The message says why and suggests upgrading. */
export class PlanLimitError extends Error {
  override name = "PlanLimitError";
}

function isPlanLimit(answer: ServerAnswer): boolean {
  return answer.status === 402 && (answer.data as { code?: unknown } | null)?.code === "plan_limit";
}

/** Sends a request and checks the answer has the expected shape. Throws an Error safe to show. */
async function postAndParse<T>(path: string, init: RequestInit, schema: z.ZodType<T>): Promise<T> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) throw new Error(t().api.noAddress);

  // The access token proves to the server which student is asking.
  let answer = await send(baseUrl, path, init, await getAccessToken());

  if (answer.status === 401 && supabase) {
    // The token may just have expired: refresh it once and try again.
    const refreshed = await supabase.auth.refreshSession();
    if (refreshed.error || !refreshed.data.session) {
      // The session really is over: signing out brings the student back to the sign-in screen.
      await supabase.auth.signOut();
      throw new Error(t().api.sessionExpired);
    }
    answer = await send(baseUrl, path, init, refreshed.data.session.access_token);
  }

  if (answer.status === 401) {
    // Still refused with a valid session: a setup problem, not the student's. Keep them signed in.
    console.warn(`[api] ${baseUrl}${path} refused a valid session (${answer.isJson ? "server" : "not the notes server"}):`, answer.data);
    throw new Error(
      answer.isJson
        ? t().api.signInRefused
        : t().api.blocked(baseUrl),
    );
  }

  if (isPlanLimit(answer)) throw new PlanLimitError(errorMessage(answer.data) ?? t().api.planLimit);

  if (answer.status < 200 || answer.status >= 300) {
    console.warn(`[api] ${path} answered ${answer.status}:`, answer.data);
    throw new Error(errorMessage(answer.data) ?? t().common.somethingWrong);
  }

  const parsed = schema.safeParse(answer.data);
  if (!parsed.success) throw new Error(t().api.unreadable);
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
  if (!file.exists) throw new Error(t().api.recordingMissing);
  form.append("audio", file);
}

const tooLong = () => t().api.tooLong;

/** The recording's bytes, wherever the platform keeps it. */
async function readRecording(uri: string): Promise<Uint8Array> {
  if (Platform.OS === "web") return new Uint8Array(await (await fetch(uri)).arrayBuffer());
  const file = new LocalFile(uri);
  if (!file.exists) throw new Error(t().api.recordingMissing);
  if (file.size > AUDIO_MAX_BYTES) throw new Error(tooLong());
  return file.bytes();
}

/**
 * Uploads the recording to the student's private storage folder and returns its path.
 * Recordings go there rather than to the server, because hosting platforms cap request size
 * (Vercel: 4.5 MB) while an hour of class is about 15 MB. The server deletes it once used.
 */
async function uploadRecording(uri: string): Promise<string> {
  if (!supabase) throw new Error(t().api.accountsOff);
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) throw new Error(t().api.sessionExpired);

  const bytes = await readRecording(uri);
  const extension = Platform.OS === "web" ? "webm" : "m4a";
  const path = recordingPath(userId, randomUUID(), extension);
  const { error } = await supabase.storage.from(RECORDINGS_BUCKET).upload(path, bytes, {
    contentType: Platform.OS === "web" ? "audio/webm" : "audio/mp4",
    upsert: false,
  });
  if (error) {
    console.warn("[api] recording upload failed:", error.message);
    throw new ConnectionError(t().api.uploadFailed);
  }
  return path;
}

/** What the server did with a recording: notes written already, or being written in the background. */
export type RecordingOutcome = { kind: "done"; response: NotesResponse } | { kind: "processing"; job: NotesJobResponse };

const RecordingAnswerSchema = z.union([NotesJobResponseSchema, NotesResponseSchema]);

/**
 * Sends a recording to be turned into notes. Throws an Error safe to show the student.
 * With accounts, the recording goes to storage and the server writes the notes in the background.
 */
export async function sendRecording(recording: Recording, language: NoteLanguage): Promise<RecordingOutcome> {
  if (supabase) {
    const path = await uploadRecording(recording.uri);
    try {
      const answer = await postAndParse(
        "/api/notes/audio",
        {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recordingPath: path, language, lostTimes: recording.lostTimes, background: true }),
        },
        RecordingAnswerSchema,
      );
      return "status" in answer ? { kind: "processing", job: answer } : { kind: "done", response: answer };
    } catch (err) {
      // The server deletes the recording once it has used it; if the request failed before that,
      // do not leave the class audio in storage. The phone keeps its own copy for a retry.
      await supabase.storage.from(RECORDINGS_BUCKET).remove([path]).catch(() => {});
      throw err;
    }
  }

  // Without accounts (a local server), the recording is sent to the server directly.
  const form = new FormData();
  await appendRecording(form, recording.uri);
  form.append("language", language);
  form.append("lostTimes", JSON.stringify(recording.lostTimes));
  return { kind: "done", response: await postForStudyPack("/api/notes/audio", { body: form }) };
}

export function requestStudyPackFromTranscript(transcript: string, language: NoteLanguage): Promise<NotesResponse> {
  return postForStudyPack("/api/notes", {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript, language }),
  });
}
