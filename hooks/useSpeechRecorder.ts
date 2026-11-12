import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Segment } from "@/lib/transcript";

/* Minimal typing for the browser speech recognition API, which TypeScript does not ship. */
type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type RecognitionEvent = { resultIndex: number; results: { length: number; [i: number]: RecognitionResult } };
type Recognizer = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: RecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
};
type RecognizerConstructor = new () => Recognizer;

function getRecognizerConstructor(): RecognizerConstructor | undefined {
  const w = window as unknown as Record<string, RecognizerConstructor | undefined>;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

const noopSubscribe = () => () => {};

const ERROR_MESSAGES: Record<string, string> = {
  "not-allowed": "Microphone access was blocked. Allow it in your browser settings and try again.",
  "service-not-allowed": "Microphone access was blocked. Allow it in your browser settings and try again.",
  "audio-capture": "No microphone was found on this device.",
  network: "Live transcription needs an internet connection.",
};

/**
 * Live speech-to-text for one class session, including the "I'm lost" markers.
 * Owns the timeline clock so pauses do not shift timestamps.
 */
export function useSpeechRecorder() {
  const supported = useSyncExternalStore(
    noopSubscribe,
    () => Boolean(getRecognizerConstructor()),
    () => true,
  );

  const [recording, setRecording] = useState(false);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [interim, setInterim] = useState("");
  const [lostTimes, setLostTimes] = useState<number[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");

  const recognizer = useRef<Recognizer | null>(null);
  const shouldListen = useRef(false);
  const resumedAt = useRef(0);
  const elapsedBeforeResume = useRef(0);

  const now = useCallback(() => elapsedBeforeResume.current + (Date.now() - resumedAt.current) / 1000, []);

  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setElapsed(now()), 500);
    return () => clearInterval(id);
  }, [recording, now]);

  // Release the microphone if the component goes away mid-recording.
  useEffect(
    () => () => {
      shouldListen.current = false;
      recognizer.current?.stop();
    },
    [],
  );

  const start = useCallback(
    (language: string) => {
      const Recognition = getRecognizerConstructor();
      if (!Recognition) return;

      const rec = new Recognition();
      rec.lang = language;
      rec.continuous = true;
      rec.interimResults = true;

      rec.onresult = (e) => {
        let live = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const text = e.results[i][0].transcript.trim();
          if (!text) continue;
          if (e.results[i].isFinal) setSegments((prev) => [...prev, { t: now(), text }]);
          else live += `${text} `;
        }
        setInterim(live);
      };

      rec.onerror = (e) => {
        const message = ERROR_MESSAGES[e.error];
        if (!message) return; // "no-speech" and "aborted" are normal during a class.
        shouldListen.current = false;
        setError(message);
      };

      // Browsers stop listening after a silence; keep going until the student stops.
      rec.onend = () => {
        if (shouldListen.current) {
          try {
            rec.start();
            return;
          } catch {
            shouldListen.current = false;
          }
        }
        elapsedBeforeResume.current = now();
        setRecording(false);
        setInterim("");
      };

      recognizer.current = rec;
      shouldListen.current = true;
      resumedAt.current = Date.now();
      setError("");
      try {
        rec.start();
        setRecording(true);
      } catch {
        shouldListen.current = false;
        setError("Could not start the microphone. Try again.");
      }
    },
    [now],
  );

  const stop = useCallback(() => {
    shouldListen.current = false;
    recognizer.current?.stop();
  }, []);

  const markLost = useCallback(() => setLostTimes((prev) => [...prev, now()]), [now]);

  const reset = useCallback(() => {
    setSegments([]);
    setLostTimes([]);
    setInterim("");
    setElapsed(0);
    setError("");
    elapsedBeforeResume.current = 0;
  }, []);

  return { supported, recording, segments, interim, lostTimes, elapsed, error, start, stop, markLost, reset };
}

export type SpeechRecorder = ReturnType<typeof useSpeechRecorder>;
