import type { StudyPack } from "./schema";

/** Renders a study pack as Markdown, for copying into another notes app. */
export function studyPackToMarkdown(pack: StudyPack): string {
  const out: string[] = [`# ${pack.title}`, `_${pack.subject}_`, "", "## Summary", pack.summary, "", "## Focus on"];

  for (const f of pack.focus) {
    out.push(`- **${f.topic}** (${f.priority}): ${f.why}`);
  }

  out.push("", "## Notes");
  for (const section of pack.notes) {
    out.push(`### ${section.heading}`, ...section.points.map((p) => `- ${p}`), "");
  }

  if (pack.key_terms.length) {
    out.push("## Key terms", ...pack.key_terms.map((k) => `- **${k.term}**: ${k.definition}`), "");
  }
  if (pack.lost_moments.length) {
    out.push("## Re-explained", ...pack.lost_moments.map((m) => `- ${m.simple_explanation}`), "");
  }
  if (pack.next_steps.length) {
    out.push("## Before the next class", ...pack.next_steps.map((s) => `- [ ] ${s}`));
  }

  return out.join("\n").trim() + "\n";
}
