import { describe, expect, it } from "vitest";
import { ar } from "../src/i18n/ar";
import { en } from "../src/i18n/en";
import { fr } from "../src/i18n/fr";

/** Every path to a text, with "()" marking texts that take values. */
function shape(value: unknown, path = ""): string[] {
  if (typeof value === "function") return [`${path}()`];
  if (typeof value === "string") return [path];
  if (Array.isArray(value)) return value.flatMap((item, i) => shape(item, `${path}[${i}]`));
  return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) => shape(item, `${path}.${key}`));
}

describe("app translations", () => {
  it("have every English text in French and Arabic", () => {
    expect(shape(fr)).toEqual(shape(en));
    expect(shape(ar)).toEqual(shape(en));
  });

  it("leave no text empty", () => {
    for (const messages of [en, fr, ar]) {
      const empty = shape(messages).filter((path) => {
        if (path.endsWith("()")) return false;
        const value = path
          .slice(1)
          .split(/\.|\[|\]\.?/)
          .filter(Boolean)
          .reduce<unknown>((node, key) => (node as Record<string, unknown>)[key], messages);
        return typeof value === "string" && value.trim() === "";
      });
      expect(empty).toEqual([]);
    }
  });

  it("agree Arabic nouns with their number", () => {
    expect(ar.plans.features.classes(3)).toBe("3 دروس في الشهر");
    expect(ar.plans.features.classes(30)).toBe("30 درسًا في الشهر");
    expect(ar.plans.features.fairUse(100)).toBe("100 درس في الشهر (استخدام معقول)");
    expect(ar.duration.minutes(30)).toBe("30 دقيقة");
    expect(ar.duration.hours(2)).toBe("ساعتان");
    expect(ar.recorder.lostMoments(1)).toBe("لحظة ضياع واحدة");
  });
});
