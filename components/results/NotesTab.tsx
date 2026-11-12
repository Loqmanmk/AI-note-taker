import type { StudyPack } from "@/lib/schema";

export function NotesTab({ pack }: { pack: StudyPack }) {
  return (
    <section>
      {pack.notes.map((section, i) => (
        <div key={i} className="card">
          <h3>{section.heading}</h3>
          <ul>
            {section.points.map((point, j) => (
              <li key={j}>{point}</li>
            ))}
          </ul>
        </div>
      ))}

      {pack.key_terms.length > 0 && (
        <div className="card">
          <h3>Key terms</h3>
          <dl>
            {pack.key_terms.map((entry, i) => (
              <div key={i}>
                <dt>{entry.term}</dt>
                <dd>{entry.definition}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </section>
  );
}
