import { useCallback, useEffect, useRef, useState } from "react";
import {
  AudioQuality,
  IOSOutputFormat,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
  type RecordingOptions,
} from "expo-audio";
import { File as LocalFile } from "expo-file-system";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import type { Recording } from "@/lib/api";

/**
 * Speech-quality mono audio at a low bitrate: about 15 MB per hour, small
 * enough to upload over Wi-Fi and clear enough for the AI to understand.
 */
const CLASS_RECORDING: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  extension: ".m4a",
  sampleRate: 22050,
  numberOfChannels: 1,
  bitRate: 32000,
  isMeteringEnabled: true,
  // The document folder is never emptied by the system, unlike the cache: a class waiting to be
  // sent must survive until its notes are saved.
  directory: "document",
  android: { outputFormat: "mpeg4", audioEncoder: "aac" },
  ios: { ...RecordingPresets.HIGH_QUALITY.ios, outputFormat: IOSOutputFormat.MPEG4AAC, audioQuality: AudioQuality.MEDIUM },
};

/** How many recent sound levels the meter shows. */
export const LEVEL_HISTORY = 36;
const STATUS_INTERVAL_MS = 120;

/** Turns a level in decibels (about -160 to 0) into 0..1, where quiet rooms sit near 0. */
function normalizeLevel(decibels: number | undefined): number {
  if (decibels === undefined || !Number.isFinite(decibels)) return 0;
  return Math.max(0, Math.min(1, (decibels + 55) / 55));
}

/** Vibration is a nicety; never let it break recording. */
function tap(style: Haptics.ImpactFeedbackStyle) {
  Haptics.impactAsync(style).catch(() => {});
}

export type RecorderPhase = "idle" | "recording" | "recorded";

/**
 * Records one class and remembers when the student pressed "I'm lost".
 * With maxSeconds, the recording stops by itself at that length (the plan's longest class),
 * even with the phone locked, since the phone's audio system enforces it.
 */
export function useClassRecorder(maxSeconds?: number) {
  /** Whether a recording is under way that the student has not stopped. */
  const recordingNow = useRef(false);
  /** Handles the phone stopping the recording at the plan's limit; set after each render. */
  const onStoppedByPhone = useRef<(url: string | null) => void>(() => {});
  const recorder = useAudioRecorder(CLASS_RECORDING, (status) => {
    if (status.isFinished && recordingNow.current) onStoppedByPhone.current(status.url);
  });
  const state = useAudioRecorderState(recorder, STATUS_INTERVAL_MS);

  const [phase, setPhase] = useState<RecorderPhase>("idle");
  const [lostTimes, setLostTimes] = useState<number[]>([]);
  const [recording, setRecording] = useState<Recording | null>(null);
  const [finalSeconds, setFinalSeconds] = useState(0);
  const [levels, setLevels] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [stoppedAtLimit, setStoppedAtLimit] = useState(false);
  const lastSample = useRef(-1);
  /** The latest length seen while recording: the status reads 0 once the phone stopped it. */
  const elapsed = useRef(0);

  // Keep a short history of sound levels for the meter, one sample per status update.
  const sampleTime = state.durationMillis;
  const sampleLevel = normalizeLevel(state.metering);
  useEffect(() => {
    if (phase !== "recording" || sampleTime === lastSample.current) return;
    lastSample.current = sampleTime;
    elapsed.current = Math.max(elapsed.current, sampleTime / 1000);
    setLevels((prev) => [...prev.slice(1 - LEVEL_HISTORY), sampleLevel]);
  }, [phase, sampleTime, sampleLevel]);

  const start = useCallback(async () => {
    setError("");
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setError("FocusNotes needs the microphone to record your class. Allow it in your phone's settings.");
        return;
      }
      // Keep recording when the phone locks or the student switches apps (needs an app build,
      // not Expo Go). Android shows a "Recording audio" notification while it records.
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true, allowsBackgroundRecording: true });
      // A new file for each class, so a recording waiting to be sent is never overwritten.
      await recorder.prepareToRecordAsync({ fileName: `class-${Date.now()}` });
      // The phone's audio system stops at the plan's longest class, even with the app asleep.
      recorder.record(maxSeconds ? { forDuration: maxSeconds } : undefined);
      recordingNow.current = true;
      tap(Haptics.ImpactFeedbackStyle.Medium);
      elapsed.current = 0;
      setStoppedAtLimit(false);
      setLostTimes([]);
      setLevels([]);
      setRecording(null);
      setPhase("recording");
    } catch {
      setError("Could not start recording. Close other apps that use the microphone and try again.");
    }
  }, [recorder, maxSeconds]);

  /** Keeps the finished recording, ready to be sent. */
  const finish = useCallback(
    (seconds: number, uri: string | null) => {
      setAudioModeAsync({ allowsRecording: false, allowsBackgroundRecording: false }).catch(() => {});
      if (!uri) {
        setError("The recording could not be saved. Try again.");
        setPhase("idle");
        return;
      }
      setFinalSeconds(seconds);
      setRecording({ uri, lostTimes });
      setPhase("recorded");
    },
    [lostTimes],
  );

  const stop = useCallback(async () => {
    recordingNow.current = false;
    const seconds = Math.max(recorder.getStatus().durationMillis / 1000, elapsed.current);
    tap(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await recorder.stop();
    } catch {
      // Stopping twice or after an interruption still leaves a usable file.
    }
    finish(seconds, recorder.uri);
  }, [recorder, finish]);

  useEffect(() => {
    onStoppedByPhone.current = (url) => {
      recordingNow.current = false;
      tap(Haptics.ImpactFeedbackStyle.Heavy);
      finish(maxSeconds ?? elapsed.current, url ?? recorder.uri);
      setStoppedAtLimit(true);
    };
  });

  /** Marks the current moment and returns its time in seconds. */
  const markLost = useCallback((): number => {
    const seconds = recorder.getStatus().durationMillis / 1000;
    tap(Haptics.ImpactFeedbackStyle.Heavy);
    setLostTimes((prev) => [...prev, seconds]);
    return seconds;
  }, [recorder]);

  /** Forgets the recording without deleting it, once it has been handed over to be sent. */
  const release = useCallback(() => {
    setRecording(null);
    setLostTimes([]);
    setLevels([]);
    setFinalSeconds(0);
    setError("");
    setStoppedAtLimit(false);
    setPhase("idle");
  }, []);

  /** Throws the recording away, file included. */
  const discard = useCallback(() => {
    if (recording && Platform.OS !== "web") {
      try {
        const file = new LocalFile(recording.uri);
        if (file.exists) file.delete();
      } catch {
        // Only costs space.
      }
    }
    setRecording(null);
    setLostTimes([]);
    setLevels([]);
    setFinalSeconds(0);
    setError("");
    setStoppedAtLimit(false);
    setPhase("idle");
  }, [recording]);

  return {
    phase,
    seconds: phase === "recording" ? state.durationMillis / 1000 : finalSeconds,
    levels,
    lostCount: lostTimes.length,
    recording,
    error,
    /** Whether the recording ended because it reached the plan's longest class. */
    stoppedAtLimit,
    maxSeconds,
    start,
    stop,
    markLost,
    discard,
    release,
  };
}

export type ClassRecorder = ReturnType<typeof useClassRecorder>;
