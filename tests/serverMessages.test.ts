import { describe, expect, it } from "vitest";
import { formatLength, requestLanguage, serverMessages } from "../lib/server/messages";

const withLanguage = (value?: string) =>
  new Request("http://localhost/api/notes", value ? { headers: { "accept-language": value } } : undefined);

describe("server messages", () => {
  it("answers in the app's language, English otherwise", () => {
    expect(requestLanguage(withLanguage("fr"))).toBe("fr");
    expect(requestLanguage(withLanguage("ar-MA,fr;q=0.8"))).toBe("ar");
    expect(requestLanguage(withLanguage("de-DE"))).toBe("en");
    expect(requestLanguage(withLanguage())).toBe("en");
  });

  it("has every message in every language", () => {
    const keys = Object.keys(serverMessages("en")).sort();
    expect(Object.keys(serverMessages("fr")).sort()).toEqual(keys);
    expect(Object.keys(serverMessages("ar")).sort()).toEqual(keys);
  });

  it("formats plan limits", () => {
    const fr = serverMessages("fr");
    expect(fr.tooLongForPlan("Free", formatLength(30, fr))).toContain("30 minutes");
    expect(formatLength(120, serverMessages("en"))).toBe("2 hours");
    expect(serverMessages("en").monthlyLimit(3, "Free")).toBe("You have used your 3 Free classes this month. Upgrade to keep going.");
  });
});
