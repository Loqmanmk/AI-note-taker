import type { QuizAnswers } from "@/lib/quiz";
import type { StudyPack } from "@/lib/schema";

type QuizTabProps = {
  quiz: StudyPack["quiz"];
  answers: QuizAnswers;
  onAnswer: (question: number, option: number) => void;
};

export function QuizTab({ quiz, answers, onAnswer }: QuizTabProps) {
  if (quiz.length === 0) return <p className="muted">No quiz for this class.</p>;

  return (
    <section>
      {quiz.map((q, i) => {
        const picked = answers[i];
        const answered = picked !== undefined;
        return (
          <div key={i} className="card">
            <h3>
              {i + 1}. {q.question}
            </h3>
            <div className="options">
              {q.options.map((option, j) => {
                const state = !answered ? "" : j === q.correct_index ? "right" : j === picked ? "wrong" : "";
                return (
                  <button
                    key={j}
                    type="button"
                    className={`option ${state}`}
                    disabled={answered}
                    onClick={() => onAnswer(i, j)}
                  >
                    {option}
                    {state === "right" && <span className="mark"> ✓</span>}
                    {state === "wrong" && <span className="mark"> ✗</span>}
                  </button>
                );
              })}
            </div>
            {answered && (
              <p className="explain" role="status">
                <strong>{picked === q.correct_index ? "Correct. " : "Not quite. "}</strong>
                {q.explanation}
              </p>
            )}
          </div>
        );
      })}
    </section>
  );
}
