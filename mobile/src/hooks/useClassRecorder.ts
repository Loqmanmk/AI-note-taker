import { useCallback, useState } from "react";
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
  android: { outputFormat: "mpeg4", audioEncoder: "aac" },
  ios: { ...RecordingPresets.HIGH_QUALITY.ios, outputFormat: IOSOutputFormat.MPEG4AAC, audioQuality: AudioQuality.MEDIUM },
};

export type RecorderPhase = "idle" | "recording" | "recorded";

/** Records one class and remembers when the student pressed "I'm lost". */
export function useClassRecorder() {
  const recorder = useAudioRecorder(CLASS_RECORDING);
  const state = useAudioRecorderState(recorder, 500);

  const [phase, setPhase] = useState<RecorderPhase>("idle");
  const [lostTimes, setLostTimes] = useState<number[]>([]);
  const [recording, setRecording] = useState<Recording | null>(null);
  const [finalSeconds, setFinalSeconds] = useState(0);
  const [error, setError] = useState("");

  const liveSeconds = state.durationMillis / 1000;

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
      setLostTimes([]);
      setRecording(null);
      setPhase("recording");
    } catch {
      setError("Could not start recording. Close other apps that use the microphone and try again.");
    }
  }, [recorder]);

  const stop = useCallback(async () => {
    const seconds = recorder.getStatus().durationMillis / 1000;
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

  const markLost = useCallback(() => {
    const seconds = recorder.getStatus().durationMillis / 1000;
    setLostTimes((prev) => [...prev, seconds]);
  }, [recorder]);

  const discard = useCallback(() => {
    setRecording(null);
    setLostTimes([]);
    setFinalSeconds(0);
    setError("");
    setPhase("idle");
  }, []);

  return {
    phase,
    seconds: phase === "recording" ? liveSeconds : finalSeconds,
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
