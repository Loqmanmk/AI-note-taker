import { useMemo, useRef, useState } from "react";
import { ScrollView, Share, StyleSheet, View, type ScrollViewInstance } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { studyPackToMarkdown } from "@shared/markdown";
import { scoreQuiz, type QuizAnswers } from "@shared/quiz";
import { ClassHero } from "@/components/results/ClassHero";
import { FocusTab } from "@/components/results/FocusTab";
import { LostMomentsTab } from "@/components/results/LostMomentsTab";
import { NotesTab } from "@/components/results/NotesTab";
import { QuizTab } from "@/components/results/QuizTab";
import { SectionTabs, type SectionTab } from "@/components/results/SectionTabs";
import { Card, IconBubble, IconButton, Txt } from "@/components/ui";
import { classStore } from "@/lib/classStore";
import { radius, spacing, useTheme } from "@/lib/theme";

type TabId = "focus" | "notes" | "quiz" | "lost" | "summary";

export default function ClassScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const saved = classStore.find(id);

  const [tab, setTab] = useState<TabId>("focus");
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [quizIndex, setQuizIndex] = useState(0);
  const scroller = useRef<ScrollViewInstance>(null);
  const scrollY = useRef(0);
  const heroHeight = useRef(0);
  const score = useMemo(() => scoreQuiz(saved?.pack.quiz ?? [], answers), [saved, answers]);

  if (!saved) {
    return (
      <View style={styles.missing}>
        <IconBubble name="document-outline" color={theme.muted} background={theme.cardAlt} size={56} />
        <Txt tone="muted">This class is no longer on this phone.</Txt>
      </View>
    );
  }

  const { pack, demo } = saved;
  const quizDone = quizIndex >= pack.quiz.length;
  const tabs: SectionTab<TabId>[] = [
    { id: "focus", label: "Focus", icon: "flame" },
    { id: "notes", label: "Notes", icon: "document-text" },
    {
      id: "quiz",
      label: "Quiz",
      icon: "help-circle",
      badge: quizDone && pack.quiz.length ? `${score.correct}/${pack.quiz.length}` : undefined,
    },
    {
      id: "lost",
      label: "Lost",
      icon: "help-buoy",
      badge: pack.lost_moments.length ? String(pack.lost_moments.length) : undefined,
    },
    { id: "summary", label: "Summary", icon: "reader" },
  ];

  /** Switches section; if the student had scrolled into the content, brings the tabs back to the top. */
  function selectTab(next: TabId) {
    setTab(next);
    if (scrollY.current > heroHeight.current) {
      scroller.current?.scrollTo({ y: heroHeight.current, animated: false });
    }
  }

  function share() {
    Share.share({ title: pack.title, message: studyPackToMarkdown(pack) }).catch(() => {});
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "",
          headerRight: () => <IconButton icon="share-outline" label="Share notes" onPress={share} />,
        }}
      />
      {/* Index 1 (the tabs) sticks to the top while the content scrolls. */}
      <ScrollView
        ref={scroller}
        contentContainerStyle={styles.screen}
        stickyHeaderIndices={[1]}
        scrollEventThrottle={32}
        onScroll={(e) => {
          scrollY.current = e.nativeEvent.contentOffset.y;
        }}
      >
        <View onLayout={(e) => (heroHeight.current = e.nativeEvent.layout.height)}>
          {demo && (
            <View style={[styles.banner, { backgroundColor: theme.mediumSoft }]}>
              <Txt variant="small" color={theme.medium}>
                Demo mode: the server has no AI key, so this is a fixed example and not based on your recording.
              </Txt>
            </View>
          )}
          <ClassHero saved={saved} />
        </View>

        <SectionTabs tabs={tabs} selected={tab} onSelect={selectTab} />

        <View>
          {tab === "focus" && <FocusTab pack={pack} missedTopics={score.missedTopics} />}
          {tab === "notes" && <NotesTab pack={pack} />}
          {tab === "quiz" && (
            <QuizTab
              quiz={pack.quiz}
              answers={answers}
              score={score}
              index={quizIndex}
              onAnswer={(question, option) => setAnswers((prev) => ({ ...prev, [question]: option }))}
              onNext={() => setQuizIndex((i) => i + 1)}
              onRestart={() => {
                setAnswers({});
                setQuizIndex(0);
              }}
              onReviewFocus={() => selectTab("focus")}
            />
          )}
          {tab === "lost" && <LostMomentsTab moments={pack.lost_moments} />}
          {tab === "summary" && (
            <Card>
              <Txt variant="caption" style={styles.summaryLabel}>
                In short
              </Txt>
              <Txt style={styles.summary}>{pack.summary}</Txt>
            </Card>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: spacing.lg, paddingBottom: 64 },
  missing: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.xl },
  banner: { borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  summaryLabel: { marginBottom: spacing.sm },
  summary: { fontSize: 17, lineHeight: 27 },
});
