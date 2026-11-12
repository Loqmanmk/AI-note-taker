import type { StudyPack } from "@/lib/schema";

export function LostMomentsTab({ moments }: { moments: StudyPack["lost_moments"] }) {
  if (moments.length === 0) {
    return (
      <p className="muted">
        No moments marked. Press “I’m lost” during a live recording and that part will be re-explained here.
      </p>
    );
  }

  return (
    <section>
      {moments.map((moment, i) => (
        <div key={i} className="card">
          <span className="pill">Moment {moment.marker}</span>
          <h3>What the teacher was saying</h3>
          <p>{moment.what_was_said}</p>
          <h3>In simpler words</h3>
          <p>{moment.simple_explanation}</p>
        </div>
      ))}
    </section>
  );
}
