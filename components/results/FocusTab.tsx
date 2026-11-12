import type { StudyPack } from "@/lib/schema";

type FocusTabProps = {
  pack: StudyPack;
  /** Focus topics the student got wrong in the quiz. */
  missedTopics: string[];
};

export function FocusTab({ pack, missedTopics }: FocusTabProps) {
  return (
    <section>
      {missedTopics.length > 0 && (
        <div className="card review">
          <h3>Review again</h3>
          <p>You missed quiz questions on: {missedTopics.join(", ")}.</p>
        </div>
      )}

      {pack.focus.length === 0 && <p className="muted">No clear priorities came out of this class.</p>}
      {pack.focus.map((item, i) => (
        <article key={i} className={`card focus ${item.priority}`}>
          <span className="pill">{item.priority} priority</span>
          <h3>{item.topic}</h3>
          <p>{item.why}</p>
          {item.evidence && <blockquote>“{item.evidence}”</blockquote>}
        </article>
      ))}

      {pack.next_steps.length > 0 && (
        <div className="card">
          <h3>Before the next class</h3>
          <ul className="checks">
            {pack.next_steps.map((step, i) => (
              <li key={i}>
                <label>
                  <input type="checkbox" /> {step}
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
