/** Same calendar day in the device's time zone. */
function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** "Today", "Yesterday", a weekday within the last week, then a short date. */
export function formatRelativeDay(iso: string, now: Date = new Date(), locale?: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  if (sameDay(date, now)) return "Today";

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(date, yesterday)) return "Yesterday";

  const ageDays = (now.getTime() - date.getTime()) / 86_400_000;
  if (ageDays > 0 && ageDays < 7) return date.toLocaleDateString(locale, { weekday: "long" });
  return date.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
}

/** A stable index for a piece of text, so the same subject always gets the same colour. */
export function pickIndex(text: string, count: number): number {
  let hash = 0;
  for (const char of text.toLowerCase()) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return Math.abs(hash) % count;
}
