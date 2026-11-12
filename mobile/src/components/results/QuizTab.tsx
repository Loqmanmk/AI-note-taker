import { Pressable, StyleSheet, View } from "react-native";
import type { QuizAnswers } from "@shared/quiz";
import type { StudyPack } from "@shared/schema";
import { Card, Txt } from "@/components/ui";
import { radius, spacing, useTheme } from "@/lib/theme";

type QuizTabProps = {
  quiz: StudyPack["quiz"];
  answers: QuizAnswers;
  onAnswer: (question: number, option: number) => void;
};

export function QuizTab({ quiz, answers, onAnswer }: QuizTabProps) {
  const theme = useTheme();
  if (quiz.length === 0) return <Txt variant="muted">No quiz for this class.</Txt>;

  return (
    <View>
      {quiz.map((q, i) => {
        const picked = answers[i];
        const answered = picked !== undefined;
        return (
          <Card key={i}>
            <Txt variant="heading">
              {i + 1}. {q.question}
            </Txt>
            {q.options.map((option, j) => {
              const isRight = answered && j === q.correct_index;
              const isWrong = answered && j === picked && !isRight;
              const color = isRight ? theme.good : isWrong ? theme.high : theme.line;
              return (
                <Pressable
                  key={j}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: answered, selected: j === picked }}
                  disabled={answered}
                  onPress={() => onAnswer(i, j)}
                  style={[
                    styles.option,
                    { borderColor: color, backgroundColor: isRight || isWrong ? color + "1f" : "transparent" },
                  ]}
                >
                  <Txt>
                    {option}
                    {isRight ? "  ✓" : isWrong ? "  ✗" : ""}
                  </Txt>
                </Pressable>
              );
            })}
            {answered && (
              <Txt style={styles.explain} accessibilityLiveRegion="polite">
                <Txt style={styles.bold}>{picked === q.correct_index ? "Correct. " : "Not quite. "}</Txt>
                {q.explanation}
              </Txt>
            )}
          </Card>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  option: {
    minHeight: 48,
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  explain: { marginTop: spacing.md },
  bold: { fontWeight: "700" },
});
