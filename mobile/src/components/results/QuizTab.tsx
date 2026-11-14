import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import type { QuizAnswers, QuizScore } from "@shared/quiz";
import type { StudyPack } from "@shared/schema";
import { Button, Card, ProgressBar, Txt, forwardArrow } from "@/components/ui";
import { useT } from "@/i18n";
import { fonts, radius, spacing, useTheme } from "@/lib/theme";

type QuizTabProps = {
  quiz: StudyPack["quiz"];
  answers: QuizAnswers;
  score: QuizScore;
  /** The question shown; equal to quiz.length once the quiz is finished. */
  index: number;
  onAnswer: (question: number, option: number) => void;
  onNext: () => void;
  onRestart: () => void;
  onReviewFocus: () => void;
};

/** One question at a time, then a score. */
export function QuizTab(props: QuizTabProps) {
  const { quiz, index } = props;
  const m = useT();
  if (quiz.length === 0) return <Txt tone="muted">{m.quiz.none}</Txt>;
  if (index >= quiz.length) return <QuizResult {...props} />;
  return <QuizQuestion {...props} />;
}

function QuizQuestion({ quiz, answers, index, onAnswer, onNext }: QuizTabProps) {
  const theme = useTheme();
  const m = useT();
  const q = quiz[index];
  const picked = answers[index];
  const answered = picked !== undefined;
  const correct = picked === q.correct_index;
  const isLast = index === quiz.length - 1;

  function answer(option: number) {
    const style = option === q.correct_index ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error;
    Haptics.notificationAsync(style).catch(() => {});
    onAnswer(index, option);
  }

  return (
    <View>
      <View style={styles.progressRow}>
        <Txt variant="label" tone="muted">
          {m.quiz.progress(index + 1, quiz.length)}
        </Txt>
      </View>
      <ProgressBar value={(index + (answered ? 1 : 0)) / quiz.length} />

      <Card style={styles.questionCard}>
        <Txt variant="title" style={styles.question}>
          {q.question}
        </Txt>

        {q.options.map((option, j) => {
          const isRight = answered && j === q.correct_index;
          const isWrong = answered && j === picked && !correct;
          const look = isRight
            ? { border: theme.good, bg: theme.goodSoft, icon: "checkmark-circle" as const, iconColor: theme.good }
            : isWrong
              ? { border: theme.high, bg: theme.highSoft, icon: "close-circle" as const, iconColor: theme.high }
              : { border: theme.line, bg: theme.card, icon: null, iconColor: theme.faint };
          return (
            <Pressable
              key={j}
              accessibilityRole="button"
              accessibilityState={{ disabled: answered, selected: j === picked }}
              accessibilityLabel={`${String.fromCharCode(65 + j)}. ${option}${isRight ? `, ${m.quiz.correctAnswer}` : isWrong ? `, ${m.quiz.wrongAnswer}` : ""}`}
              disabled={answered}
              onPress={() => answer(j)}
              style={({ pressed }) => [
                styles.option,
                {
                  borderColor: look.border,
                  backgroundColor: look.bg,
                  opacity: answered && !isRight && !isWrong ? 0.6 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <View style={[styles.letter, { backgroundColor: theme.cardAlt }]}>
                <Text style={[styles.letterText, { color: theme.muted }]}>{String.fromCharCode(65 + j)}</Text>
              </View>
              <Txt style={styles.grow}>{option}</Txt>
              {look.icon && <Ionicons name={look.icon} size={22} color={look.iconColor} />}
            </Pressable>
          );
        })}

        {answered && (
          <View
            style={[styles.feedback, { backgroundColor: correct ? theme.goodSoft : theme.highSoft }]}
            accessibilityLiveRegion="polite"
          >
            <Txt variant="bodyStrong" color={correct ? theme.good : theme.high}>
              {correct ? m.quiz.correct : m.quiz.notQuite}
            </Txt>
            <Txt>{q.explanation}</Txt>
          </View>
        )}
      </Card>

      {answered && (
        <Button
          kind="primary"
          icon={isLast ? "trophy-outline" : forwardArrow()}
          label={isLast ? m.quiz.seeScore : m.quiz.next}
          onPress={onNext}
        />
      )}
    </View>
  );
}

function QuizResult({ quiz, score, onRestart, onReviewFocus }: QuizTabProps) {
  const theme = useTheme();
  const m = useT();
  const ratio = score.correct / quiz.length;
  const band =
    ratio >= 0.8
      ? { color: theme.good, bg: theme.goodSoft, ...m.quiz.bands.high }
      : ratio >= 0.5
        ? { color: theme.medium, bg: theme.mediumSoft, ...m.quiz.bands.mid }
        : { color: theme.high, bg: theme.highSoft, ...m.quiz.bands.low };

  return (
    <Card style={styles.result}>
      <View style={[styles.scoreRing, { borderColor: band.color, backgroundColor: band.bg }]}>
        <Text style={[styles.scoreValue, { color: band.color }]}>
          {score.correct}/{quiz.length}
        </Text>
      </View>
      <Txt variant="title" style={styles.center}>
        {band.title}
      </Txt>
      <Txt tone="muted" style={styles.center}>
        {band.text}
      </Txt>
      {score.missedTopics.length > 0 && (
        <Txt variant="small" style={[styles.center, styles.missed]}>
          {m.quiz.toReview(score.missedTopics.join(", "))}
        </Txt>
      )}
      <View style={styles.resultActions}>
        {score.missedTopics.length > 0 && (
          <Button kind="primary" icon="flame" label={m.quiz.reviewFocus} onPress={onReviewFocus} />
        )}
        <Button icon="refresh" label={m.quiz.again} onPress={onRestart} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  progressRow: { marginBottom: spacing.sm },
  questionCard: { marginTop: spacing.lg },
  question: { marginBottom: spacing.lg },
  option: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  letter: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  letterText: { fontFamily: fonts.bold, fontSize: 14 },
  grow: { flex: 1 },
  feedback: { borderRadius: radius.md, padding: spacing.md, marginTop: spacing.sm, gap: 4 },
  result: { alignItems: "center", paddingVertical: spacing.xxl, gap: spacing.sm },
  scoreRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  scoreValue: { fontFamily: fonts.extrabold, fontSize: 34 },
  center: { textAlign: "center" },
  missed: { marginTop: spacing.xs },
  resultActions: { alignSelf: "stretch", gap: spacing.sm, marginTop: spacing.lg },
});
