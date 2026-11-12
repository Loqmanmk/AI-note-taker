import { describe, expect, it } from "vitest";
import { studyPackToMarkdown } from "../lib/markdown";
import { scoreQuiz } from "../lib/quiz";
import { SAMPLE_PACK } from "../lib/sample";

describe("scoreQuiz", () => {
  it("counts correct answers and lists each missed topic once", () => {
    // Questions 2 and 3 share a topic; answer both wrong, and question 0 right.
    const score = scoreQuiz(SAMPLE_PACK.quiz, { 0: 1, 2: 0, 3: 0 });
    expect(score.answered).toBe(3);
    expect(score.correct).toBe(1);
    expect(score.missedTopics).toEqual(["Inputs and outputs of the Calvin cycle"]);
  });

  it("starts empty", () => {
    expect(scoreQuiz(SAMPLE_PACK.quiz, {})).toEqual({ answered: 0, correct: 0, missedTopics: [] });
  });
});

describe("studyPackToMarkdown", () => {
  it("includes the title, focus topics and to-do items", () => {
    const md = studyPackToMarkdown(SAMPLE_PACK);
    expect(md).toContain("# Photosynthesis: the two stages");
    expect(md).toContain("**Where the oxygen comes from** (high)");
    expect(md).toContain("- [ ] Read chapter 8");
  });
});
