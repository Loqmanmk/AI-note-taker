import type { StudyPack } from "./schema";

/** Question index → index of the option the student picked. */
export type QuizAnswers = Record<number, number>;

export type QuizScore = {
  answered: number;
  correct: number;
  /** Focus topics with at least one wrong answer, without duplicates. */
  missedTopics: string[];
};

export function scoreQuiz(quiz: StudyPack["quiz"], answers: QuizAnswers): QuizScore {
  const answeredQuestions = quiz.filter((_, i) => answers[i] !== undefined);
  const wrong = quiz.filter((q, i) => answers[i] !== undefined && answers[i] !== q.correct_index);
  return {
    answered: answeredQuestions.length,
    correct: answeredQuestions.length - wrong.length,
    missedTopics: [...new Set(wrong.map((q) => q.topic))],
  };
}
