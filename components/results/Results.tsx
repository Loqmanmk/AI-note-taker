import { useMemo, useState } from "react";
import { Tabs } from "@/components/Tabs";
import { studyPackToMarkdown } from "@/lib/markdown";
import { scoreQuiz, type QuizAnswers } from "@/lib/quiz";
import type { SavedClass } from "@/lib/schema";
import { FocusTab } from "./FocusTab";
import { LostMomentsTab } from "./LostMomentsTab";
import { NotesTab } from "./NotesTab";
import { QuizTab } from "./QuizTab";

type TabId = "focus" | "notes" | "quiz" | "lost" | "summary";

type ResultsProps = {
  saved: SavedClass;
  onBack: () => void;
};

export function Results({ saved, onBack }: ResultsProps) {
  const { pack, demo } = saved;
  const [tab, setTab] = useState<TabId>("focus");
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [copyStatus, setCopyStatus] = useState("");

  const score = useMemo(() => scoreQuiz(pack.quiz, answers), [pack.quiz, answers]);

  const tabs = [
    ["focus", "Focus"],
    ["notes", "Notes"],
    ["quiz", score.answered ? `Quiz ${score.correct}/${pack.quiz.length}` : "Quiz"],
    ["lost", pack.lost_moments.length ? `Lost moments (${pack.lost_moments.length})` : "Lost moments"],
    ["summary", "Summary"],
  ] as const;

  async function copyNotes() {
    try {
      await navigator.clipboard.writeText(studyPackToMarkdown(pack));
      setCopyStatus("Copied");
    } catch {
      setCopyStatus("Copy failed");
    }
    setTimeout(() => setCopyStatus(""), 2000);
  }

  return (
    <>
      <div className="resultbar">
        <button type="button" className="link" onClick={onBack}>
          ← New class
        </button>
        <span className="grow" />
        <button type="button" className="btn small" onClick={copyNotes}>
          {copyStatus || "Copy notes"}
        </button>
      </div>

      {demo && (
        <p className="warn" role="note">
          Demo mode: no AI key is configured on the server, so this is a fixed example and not based on your
          recording.
        </p>
      )}

      <p className="eyebrow">{pack.subject}</p>
      <h1>{pack.title}</h1>

      <Tabs label="Study pack sections" tabs={tabs} selected={tab} onSelect={setTab} />

      {tab === "focus" && <FocusTab pack={pack} missedTopics={score.missedTopics} />}
      {tab === "notes" && <NotesTab pack={pack} />}
      {tab === "quiz" && (
        <QuizTab
          quiz={pack.quiz}
          answers={answers}
          onAnswer={(question, option) => setAnswers((prev) => ({ ...prev, [question]: option }))}
        />
      )}
      {tab === "lost" && <LostMomentsTab moments={pack.lost_moments} />}
      {tab === "summary" && (
        <section className="card">
          <p>{pack.summary}</p>
        </section>
      )}
    </>
  );
}
