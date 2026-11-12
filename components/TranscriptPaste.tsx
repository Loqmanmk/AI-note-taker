import { TRANSCRIPT_MAX_CHARS } from "@/lib/constants";
import { SAMPLE_TRANSCRIPT } from "@/lib/sample";

type TranscriptPasteProps = {
  value: string;
  onChange: (value: string) => void;
};

export function TranscriptPaste({ value, onChange }: TranscriptPasteProps) {
  return (
    <section className="card" aria-label="Paste a transcript">
      <textarea
        aria-label="Class transcript"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste the text of a class here…"
        rows={12}
        maxLength={TRANSCRIPT_MAX_CHARS}
      />
      <button type="button" className="link" onClick={() => onChange(SAMPLE_TRANSCRIPT)}>
        Use an example class (biology)
      </button>
    </section>
  );
}
