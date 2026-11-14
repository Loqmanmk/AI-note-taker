import AsyncStorage from "@react-native-async-storage/async-storage";
import { File as LocalFile } from "expo-file-system";
import { AppState, Platform } from "react-native";
import { z } from "zod";
import { NOTE_LANGUAGE_CODES } from "@shared/constants";
import type { SavedClass } from "@shared/schema";
import { t } from "@/i18n";
import { ConnectionError, PlanLimitError, sendRecording } from "./api";
import { AccountClassSource } from "./classSources";
import { classStore } from "./classStore";
import { notifyNotesFailed, notifyNotesReady } from "./notifications";
import { planStore } from "./planStore";
import { supabase } from "./supabase";

/**
 * Recordings waiting for their notes. Each one stays on the phone, with its file, until its notes
 * are saved, so a lost connection, a closed app or a server failure never loses a class.
 */
const EntrySchema = z.object({
  id: z.string(),
  /** The student who recorded it; null when accounts are off. */
  userId: z.string().nullable(),
  uri: z.string(),
  createdAt: z.string(),
  durationSeconds: z.number(),
  lostTimes: z.array(z.number()),
  language: z.enum(NOTE_LANGUAGE_CODES),
  state: z.enum(["sending", "processing", "failed"]),
  /** The class the server is writing, once it accepted the recording. */
  classId: z.string().optional(),
  error: z.string().optional(),
  /** Refused because the student's plan is used up: the app offers the plans. */
  limitReached: z.boolean().optional(),
});
export type QueueEntry = z.infer<typeof EntrySchema>;
export type NewRecording = Pick<QueueEntry, "uri" | "durationSeconds" | "lostTimes" | "language">;

const STORAGE_KEY = "focusnotes.sendQueue.v1";
const POLL_MS = 5000;
/** Waits before each automatic retry when the connection fails. */
const RETRY_DELAYS_MS = [2000, 6000, 15000];
const EMPTY: QueueEntry[] = [];

function isConnectionProblem(err: unknown): boolean {
  return err instanceof ConnectionError;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function deleteFile(uri: string) {
  if (Platform.OS === "web") return; // A browser recording lives in memory.
  try {
    const file = new LocalFile(uri);
    if (file.exists) file.delete();
  } catch {
    // An orphaned file only costs space; never block the student over it.
  }
}

type Listener = () => void;

class SendQueue {
  private all: QueueEntry[] = [];
  private visible: QueueEntry[] = EMPTY;
  private userId: string | null = null;
  private loaded: Promise<void> | undefined;
  private readonly running = new Set<string>();
  private readonly listeners = new Set<Listener>();
  private poller: ReturnType<typeof setInterval> | undefined;
  private appStateSubscription: { remove: () => void } | undefined;

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** The current student's entries, newest first. */
  getSnapshot = (): QueueEntry[] => this.visible;

  /** Shows the entries of the signed-in student (or all, when accounts are off) and resumes their work. */
  async setUser(userId: string | null) {
    this.userId = userId;
    await this.load();
    this.refreshVisible();
    for (const entry of this.mine()) {
      // An app closed in the middle of a send resumes it.
      if (entry.state === "sending") this.run(entry.id);
    }
    this.updatePolling();
  }

  /** Takes a finished recording and starts sending it. */
  async add(recording: NewRecording) {
    await this.load();
    const entry: QueueEntry = {
      ...recording,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId: this.userId,
      createdAt: new Date().toISOString(),
      state: "sending",
    };
    this.save([entry, ...this.all]);
    this.run(entry.id);
  }

  /** Sends a failed recording again, from the copy kept on the phone. */
  async retry(id: string) {
    const entry = this.all.find((e) => e.id === id);
    if (!entry || entry.state !== "failed") return;
    if (entry.classId) this.removeServerClass(entry.classId);
    this.patch(id, { state: "sending", classId: undefined, error: undefined, limitReached: undefined });
    this.run(id);
  }

  /** Gives up on a recording: deletes its file and any failed class left in the account. */
  async discard(id: string) {
    const entry = this.all.find((e) => e.id === id);
    if (!entry) return;
    if (entry.classId) this.removeServerClass(entry.classId);
    this.finish(id);
  }

  /** Deletes every recording of a student from this phone, for example when they delete their account. */
  forgetUser(userId: string) {
    for (const entry of this.all.filter((e) => e.userId === userId)) deleteFile(entry.uri);
    this.save(this.all.filter((e) => e.userId !== userId));
    this.updatePolling();
  }

  private mine(): QueueEntry[] {
    return this.all.filter((e) => e.userId === this.userId);
  }

  private async run(id: string) {
    if (this.running.has(id)) return;
    this.running.add(id);
    try {
      const entry = this.all.find((e) => e.id === id);
      if (!entry) return;
      const recording = { uri: entry.uri, lostTimes: entry.lostTimes };

      for (let attempt = 0; ; attempt++) {
        try {
          const outcome = await sendRecording(recording, entry.language);
          if (outcome.kind === "processing") {
            this.patch(id, { state: "processing", classId: outcome.job.classId });
            this.updatePolling();
            planStore.refresh(); // The class now counts in the month's usage.
          } else {
            const { pack, demo, classId } = outcome.response;
            this.deliver({ id: classId ?? entry.id, date: entry.createdAt, pack, demo }, id);
          }
          return;
        } catch (err) {
          const message = err instanceof Error ? err.message : t().common.somethingWrong;
          if (isConnectionProblem(err) && attempt < RETRY_DELAYS_MS.length) {
            await sleep(RETRY_DELAYS_MS[attempt]);
            continue;
          }
          const limitReached = err instanceof PlanLimitError;
          this.patch(id, { state: "failed", error: message, limitReached });
          if (limitReached) planStore.refresh();
          return;
        }
      }
    } finally {
      this.running.delete(id);
    }
  }

  /** Checks on classes being written in the background. */
  private poll = async () => {
    const waiting = this.mine().filter((e) => e.state === "processing" && e.classId);
    if (waiting.length === 0 || !supabase) {
      this.updatePolling();
      return;
    }
    let result: Awaited<ReturnType<AccountClassSource["check"]>>;
    try {
      result = await new AccountClassSource(supabase).check(waiting.map((e) => e.classId as string));
    } catch {
      return; // Offline for now; the next check will try again.
    }
    for (const entry of waiting) {
      const ready = result.ready.find((c) => c.id === entry.classId);
      const pending = result.pending.find((c) => c.id === entry.classId);
      if (ready) {
        this.deliver({ ...ready, date: entry.createdAt }, entry.id);
        notifyNotesReady(ready.id, ready.pack.title);
      } else if (pending?.status === "failed") {
        const error = pending.error ?? t().history.queue.notWritten;
        this.patch(entry.id, { state: "failed", error });
        notifyNotesFailed(error);
        planStore.refresh(); // A failed class does not count.
      } else if (!pending) {
        this.patch(entry.id, { state: "failed", error: t().history.queue.notFound });
      }
    }
    this.updatePolling();
  };

  /** Checks every few seconds while notes are being written, and as soon as the app comes back. */
  private updatePolling() {
    const needed = this.mine().some((e) => e.state === "processing");
    if (needed && !this.poller) {
      this.poller = setInterval(this.poll, POLL_MS);
      this.appStateSubscription = AppState.addEventListener("change", (state) => {
        if (state === "active") this.poll();
      });
    } else if (!needed && this.poller) {
      clearInterval(this.poller);
      this.poller = undefined;
      this.appStateSubscription?.remove();
      this.appStateSubscription = undefined;
    }
  }

  /** Adds finished notes to the class list and forgets the recording. */
  private deliver(saved: SavedClass, entryId: string) {
    classStore.add(saved);
    this.finish(entryId);
  }

  private finish(id: string) {
    const entry = this.all.find((e) => e.id === id);
    if (entry) deleteFile(entry.uri);
    this.save(this.all.filter((e) => e.id !== id));
    this.updatePolling();
  }

  private removeServerClass(classId: string) {
    if (supabase) new AccountClassSource(supabase).remove(classId).catch(() => {});
  }

  private patch(id: string, changes: Partial<QueueEntry>) {
    this.save(this.all.map((e) => (e.id === id ? { ...e, ...changes } : e)));
  }

  private load(): Promise<void> {
    this.loaded ??= AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        const parsed = z.array(EntrySchema).safeParse(JSON.parse(raw ?? "[]"));
        if (parsed.success) this.all = parsed.data;
      })
      .catch(() => {});
    return this.loaded;
  }

  private save(entries: QueueEntry[]) {
    this.all = entries;
    this.refreshVisible();
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries)).catch(() => {});
  }

  private refreshVisible() {
    this.visible = this.mine();
    this.listeners.forEach((listener) => listener());
  }
}

export const sendQueue = new SendQueue();
