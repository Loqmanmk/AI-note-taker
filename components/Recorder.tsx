import { useEffect, useRef } from "react";
import { SPEECH_LANGUAGES } from "@/lib/constants";
import type { SpeechRecorder } from "@/hooks/useSpeechRecorder";
import { formatClock, type TranscriptLine } from "@/lib/transcript";

type RecorderProps = {
  recorder: SpeechRecorder;
  timeline: TranscriptLine[];
  speechLanguage: string;
  onSpeechLanguageChange: (code: string) => void;
};

export function Recorder({ recorder, timeline, speechLanguage, onSpeechLanguageChange }: RecorderProps) {
  const { supported, recording, interim, lostTimes, elapsed } = recorder;
  const transcriptBox = useRef<HTMLDivElement>(null);

  // Keep the newest sentence in view while the teacher talks.
  useEffect(() => {
    const box = transcriptBox.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [timeline.length, interim]);

  return (
    <section className="card" aria-label="Live recording">
      {!supported && (
        <p className="warn" role="alert">
          Live recording is not supported in this browser. Use Chrome, Edge or Safari, or paste a transcript.
        </p>
      )}

      <div className="recbar">
        <span className={recording ? "dot live" : "dot"} aria-hidden="true" />
        <span className="timer" aria-label={recording ? "Recording time" : "Recorded time"}>
          {formatClock(elapsed)}
        </span>
        <select
          aria-label="Language spoken in class"
          value={speechLanguage}
          onChange={(e) => onSpeechLanguageChange(e.target.value)}
          disabled={recording}
        >
          {SPEECH_LANGUAGES.map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
        <span className="grow" />
        {recording ? (
          <button type="button" className="btn" onClick={recorder.stop}>
            Stop
          </button>
        ) : (
          <button
            type="button"
            className="btn primary"
            onClick={() => recorder.start(speechLanguage)}
            disabled={!supported}
          >
            {timeline.length ? "Resume" : "Start recording"}
          </button>
        )}
      </div>

      <div className="transcript" ref={transcriptBox} aria-live="off" tabIndex={0} aria-label="Transcript">
        {timeline.length === 0 && !interim && (
          <p className="muted">
            What your teacher says will appear here. Make sure you are allowed to record this class.
          </p>
        )}
        {timeline.map((line, i) =>
          line.kind === "lost" ? (
            <p key={i} className="lostline">
              You marked “I’m lost” here
            </p>
          ) : (
            <p key={i}>
              <span className="ts">{formatClock(line.t)}</span>
              {line.text}
            </p>
          ),
        )}
        {interim && <p className="muted">{interim}</p>}
      </div>

      <button type="button" className="lostbtn" onClick={recorder.markLost} disabled={!recording}>
        I’m lost
        <small aria-live="polite">
          {lostTimes.length
            ? `${lostTimes.length} moment${lostTimes.length > 1 ? "s" : ""} marked. They will be re-explained after class.`
            : "Tap when you stop following. That moment gets re-explained after class."}
        </small>
      </button>
    </section>
  );
}
