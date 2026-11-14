"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { SignInScreen } from "@/components/SignInScreen";
import { HistoryList } from "@/components/HistoryList";
import { Recorder } from "@/components/Recorder";
import { Tabs } from "@/components/Tabs";
import { TranscriptPaste } from "@/components/TranscriptPaste";
import { Results } from "@/components/results/Results";
import { useAuth } from "@/hooks/useAuth";
import { useClassHistory } from "@/hooks/useClassHistory";
import { useCloudClasses } from "@/hooks/useCloudClasses";
import { useSpeechRecorder } from "@/hooks/useSpeechRecorder";
import { useUnsavedWarning } from "@/hooks/useUnsavedWarning";
import { SignInRequiredError, requestStudyPack } from "@/lib/client/notesApi";
import { NOTE_LANGUAGES, TRANSCRIPT_MIN_CHARS, type NoteLanguage } from "@/lib/constants";
import type { SavedClass } from "@/lib/schema";
import { buildTimeline, timelineToText } from "@/lib/transcript";
import { DELETE_ACCOUNT_PATH, PRIVACY_PATH } from "@/lib/legal";

type InputMode = "record" | "paste";

const INPUT_MODES = [
  ["record", "Record live"],
  ["paste", "Paste a transcript"],
] as const;

export default function Home() {
  const recorder = useSpeechRecorder();
  const auth = useAuth();
  const localHistory = useClassHistory();
  const cloudHistory = useCloudClasses(auth.session?.user.id);
  // With accounts on, classes live in the student's account; otherwise in this browser.
  const history = auth.enabled ? cloudHistory : localHistory;

  const [mode, setMode] = useState<InputMode>("record");
  const [pasted, setPasted] = useState("");
  const [speechLanguage, setSpeechLanguage] = useState("en-US");
  const [noteLanguage, setNoteLanguage] = useState<NoteLanguage>("auto");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openClass, setOpenClass] = useState<SavedClass | null>(null);

  const timeline = useMemo(
    () => buildTimeline(recorder.segments, recorder.lostTimes),
    [recorder.segments, recorder.lostTimes],
  );
  const transcript = mode === "record" ? timelineToText(timeline) : pasted.trim();
  const hasInput = timeline.length > 0 || pasted.length > 0;
  const canGenerate = !recorder.recording && !loading && transcript.length >= TRANSCRIPT_MIN_CHARS;

  useUnsavedWarning(!openClass && (recorder.recording || timeline.length > 0));

  function clearInput() {
    recorder.reset();
    setPasted("");
    setError("");
  }

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const { pack, demo, classId } = await requestStudyPack(
        { transcript, language: noteLanguage },
        auth.session?.access_token,
      );
      const saved: SavedClass = { id: classId ?? crypto.randomUUID(), date: new Date().toISOString(), pack, demo };
      if (!demo) history.add(saved);
      setOpenClass(saved);
      clearInput();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      // The transcript stays on screen, so the student can sign in again and retry.
      if (err instanceof SignInRequiredError) await auth.signOut();
    } finally {
      setLoading(false);
    }
  }

  if (auth.enabled && auth.loading) return <main className="shell" aria-busy="true" />;
  if (auth.enabled && !auth.session) return <SignInScreen onSignIn={auth.signIn} error={auth.error || error} />;

  const account = auth.session
    ? { email: auth.session.user.email ?? "Signed in", onSignOut: auth.signOut }
    : undefined;

  if (openClass) {
    return (
      <main className="shell">
        <AppHeader account={account} />
        <Results key={openClass.id} saved={openClass} onBack={() => setOpenClass(null)} />
      </main>
    );
  }

  return (
    <main className="shell">
      <AppHeader account={account} />
      <h1>Record your class. Know what to study.</h1>
      <p className="lede">
        FocusNotes listens to your teacher, writes your notes, and tells you what matters most for the exam.
      </p>

      <Tabs
        className="seg"
        label="How to add a class"
        tabs={INPUT_MODES}
        selected={mode}
        onSelect={setMode}
        disabled={recorder.recording}
      />

      {mode === "record" ? (
        <Recorder
          recorder={recorder}
          timeline={timeline}
          speechLanguage={speechLanguage}
          onSpeechLanguageChange={setSpeechLanguage}
        />
      ) : (
        <TranscriptPaste value={pasted} onChange={setPasted} />
      )}

      <div className="actions">
        <label>
          Notes language
          <select value={noteLanguage} onChange={(e) => setNoteLanguage(e.target.value as NoteLanguage)}>
            {Object.entries(NOTE_LANGUAGES).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <span className="grow" />
        {hasInput && !recorder.recording && !loading && (
          <button
            type="button"
            className="btn"
            onClick={() => {
              if (window.confirm("Clear this class? The transcript will be lost.")) clearInput();
            }}
          >
            Clear
          </button>
        )}
        <button type="button" className="btn primary" onClick={generate} disabled={!canGenerate} aria-busy={loading}>
          {loading ? "Writing your notes…" : "Create my notes"}
        </button>
      </div>

      <div aria-live="polite">
        {loading && <p className="muted status">Writing your notes. This usually takes under a minute, sometimes longer when the AI service is busy.</p>}
        {(error || recorder.error) && (
          <p className="error" role="alert">
            {error || recorder.error}
          </p>
        )}
      </div>

      {auth.enabled && cloudHistory.error && (
        <p className="error" role="alert">
          {cloudHistory.error}
        </p>
      )}
      <HistoryList items={history.items} onOpen={setOpenClass} onDelete={history.remove} />

      <footer className="footer">
        <Link href={PRIVACY_PATH}>Privacy policy</Link>
        {auth.enabled && <Link href={DELETE_ACCOUNT_PATH}>Delete my account</Link>}
      </footer>
    </main>
  );
}
