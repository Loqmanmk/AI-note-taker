import { useMemo, useState } from "react";
import { ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { studyPackToMarkdown } from "@shared/markdown";
import { scoreQuiz, type QuizAnswers } from "@shared/quiz";
import { Chips } from "@/components/Chips";
import { FocusTab } from "@/components/results/FocusTab";
import { LostMomentsTab } from "@/components/results/LostMomentsTab";
import { NotesTab } from "@/components/results/NotesTab";
import { QuizTab } from "@/components/results/QuizTab";
import { Button, Card, Txt } from "@/components/ui";
import { classStore } from "@/lib/classStore";
import { spacing, useTheme } from "@/lib/theme";

type TabId = "focus" | "notes" | "quiz" | "lost" | "summary";

export default function ClassScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const saved = classStore.find(id);

  const [tab, setTab] = useState<TabId>("focus");
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const score = useMemo(() => scoreQuiz(saved?.pack.quiz ?? [], answers), [saved, answers]);

  if (!saved) {
    return (
      <View style={styles.screen}>
        <Txt variant="muted">This class is no longer on this phone.</Txt>
      </View>
    );
  }

  const { pack, demo } = saved;
  const tabs = [
    ["focus", "Focus"],
    ["notes", "Notes"],
    ["quiz", score.answered ? `Quiz ${score.correct}/${pack.quiz.length}` : "Quiz"],
    ["lost", pack.lost_moments.length ? `Lost moments (${pack.lost_moments.length})` : "Lost moments"],
    ["summary", "Summary"],
  ] as const;

  return (
    <ScrollView contentContainerStyle={styles.screen} contentInsetAdjustmentBehavior="automatic">
      <Stack.Screen options={{ title: pack.subject || "Your notes" }} />

      {demo && (
        <View style={[styles.banner, { backgroundColor: theme.medium + "1f" }]}>
          <Txt style={{ color: theme.medium }}>
            Demo mode: the server has no AI key, so this is a fixed example and not based on your recording.
          </Txt>
        </View>
      )}

      <Text style={[styles.eyebrow, { color: theme.accent }]}>{pack.subject}</Text>
      <Txt variant="title">{pack.title}</Txt>

      <View style={styles.tabs}>
        <Chips label="Study pack sections" options={tabs} selected={tab} onSelect={setTab} />
      </View>

      {tab === "focus" && <FocusTab pack={pack} missedTopics={score.missedTopics} />}
      {tab === "notes" && <NotesTab pack={pack} />}
      {tab === "quiz" && (
        <QuizTab
          quiz={pack.quiz}
          answers={answers}
          onAnswer={(question, option) => setAnswers((prev) => ({ ...prev, [question]: option }))}
        />
      )}
      {tab === "lost" && <LostMomentsTab moments={pack.lost_moments} />}
      {tab === "summary" && (
        <Card>
          <Txt>{pack.summary}</Txt>
        </Card>
      )}

      <Button
        label="Share notes"
        onPress={() => {
          Share.share({ title: pack.title, message: studyPackToMarkdown(pack) }).catch(() => {});
        }}
        style={styles.share}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: spacing.lg, paddingBottom: 60 },
  banner: { borderRadius: 10, padding: spacing.md, marginBottom: spacing.lg },
  eyebrow: { fontSize: 13, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1, marginBottom: spacing.xs },
  tabs: { marginVertical: spacing.md },
  share: { marginTop: spacing.md },
});
