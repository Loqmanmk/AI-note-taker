import type { SavedClass } from "@/lib/schema";

type HistoryListProps = {
  items: SavedClass[];
  onOpen: (item: SavedClass) => void;
  onDelete: (id: string) => void;
};

export function HistoryList({ items, onOpen, onDelete }: HistoryListProps) {
  if (items.length === 0) return null;

  return (
    <section className="history" aria-labelledby="history-title">
      <h2 id="history-title">Previous classes</h2>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <button type="button" className="open" onClick={() => onOpen(item)}>
              <strong>{item.pack.title}</strong>
              <span>
                {item.pack.subject} · {new Date(item.date).toLocaleDateString()}
              </span>
            </button>
            <button
              type="button"
              className="delete"
              aria-label={`Delete ${item.pack.title}`}
              onClick={() => {
                if (window.confirm(`Delete “${item.pack.title}”? This cannot be undone.`)) onDelete(item.id);
              }}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
