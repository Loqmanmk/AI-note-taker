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
import * as Haptics from "expo-haptics";
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

/** Records one class and remembers when the student pressed "I'm lost". */
export function useClassRecorder() {
  const recorder = useAudioRecorder(CLASS_RECORDING);
  const state = useAudioRecorderState(recorder, STATUS_INTERVAL_MS);

  const [phase, setPhase] = useState<RecorderPhase>("idle");
  const [lostTimes, setLostTimes] = useState<number[]>([]);
  const [recording, setRecording] = useState<Recording | null>(null);
  const [finalSeconds, setFinalSeconds] = useState(0);
  const [levels, setLevels] = useState<number[]>([]);
  const [error, setError] = useState("");
  const lastSample = useRef(-1);

  // Keep a short history of sound levels for the meter, one sample per status update.
  const sampleTime = state.durationMillis;
  const sampleLevel = normalizeLevel(state.metering);
  useEffect(() => {
    if (phase !== "recording" || sampleTime === lastSample.current) return;
    lastSample.current = sampleTime;
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
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      tap(Haptics.ImpactFeedbackStyle.Medium);
      setLostTimes([]);
      setLevels([]);
      setRecording(null);
      setPhase("recording");
    } catch {
      setError("Could not start recording. Close other apps that use the microphone and try again.");
    }
  }, [recorder]);

  const stop = useCallback(async () => {
    const seconds = recorder.getStatus().durationMillis / 1000;
    tap(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
    } catch {
      // Stopping twice or after an interruption still leaves a usable file.
    }
    if (!recorder.uri) {
      setError("The recording could not be saved. Try again.");
      setPhase("idle");
      return;
    }
    setFinalSeconds(seconds);
    setRecording({ uri: recorder.uri, lostTimes });
    setPhase("recorded");
  }, [recorder, lostTimes]);

  /** Marks the current moment and returns its time in seconds. */
  const markLost = useCallback((): number => {
    const seconds = recorder.getStatus().durationMillis / 1000;
    tap(Haptics.ImpactFeedbackStyle.Heavy);
    setLostTimes((prev) => [...prev, seconds]);
    return seconds;
  }, [recorder]);

  const discard = useCallback(() => {
    setRecording(null);
    setLostTimes([]);
    setLevels([]);
    setFinalSeconds(0);
    setError("");
    setPhase("idle");
  }, []);

  return {
    phase,
    seconds: phase === "recording" ? state.durationMillis / 1000 : finalSeconds,
    levels,
    lostCount: lostTimes.length,
    recording,
    error,
    start,
    stop,
    markLost,
    discard,
  };
}

export type ClassRecorder = ReturnType<typeof useClassRecorder>;
