import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { StudyPack } from "@shared/schema";
import { Badge, Card, IconBubble, Txt, type IconName } from "@/components/ui";
import { useT, type Messages } from "@/i18n";
import { radius, spacing, useTheme, type Theme } from "@/lib/theme";

type Priority = StudyPack["focus"][number]["priority"];

function priorityLook(theme: Theme, m: Messages, priority: Priority): { color: string; bg: string; icon: IconName; label: string } {
  const label = m.focus.priority[priority];
  return {
    high: { color: theme.high, bg: theme.highSoft, icon: "flame" as const, label },
    medium: { color: theme.medium, bg: theme.mediumSoft, icon: "flag" as const, label },
    low: { color: theme.low, bg: theme.lowSoft, icon: "leaf" as const, label },
  }[priority];
}

type FocusTabProps = {
  pack: StudyPack;
  /** Focus topics the student got wrong in the quiz. */
  missedTopics: string[];
};

export function FocusTab({ pack, missedTopics }: FocusTabProps) {
  const theme = useTheme();
  const m = useT();

  return (
    <View>
      {missedTopics.length > 0 && (
        <View style={[styles.review, { backgroundColor: theme.lostSoft }]}>
          <IconBubble name="refresh-circle" color={theme.lostInk} background={theme.card} size={36} />
          <View style={styles.grow}>
            <Txt variant="bodyStrong" color={theme.lostInk}>
              {m.focus.reviewAgain}
            </Txt>
            <Txt variant="small">{m.focus.missed(missedTopics.join(", "))}</Txt>
          </View>
        </View>
      )}

      {pack.focus.length === 0 && <Txt tone="muted">{m.focus.none}</Txt>}

      {pack.focus.map((item, i) => {
        const look = priorityLook(theme, m, item.priority);
        return (
          <Card key={i}>
            <View style={styles.cardTop}>
              <Badge label={look.label} icon={look.icon} color={look.color} background={look.bg} />
              <Txt variant="caption" tone="faint">
                #{i + 1}
              </Txt>
            </View>
            <Txt variant="heading" style={styles.topic}>
              {item.topic}
            </Txt>
            <Txt tone="muted">{item.why}</Txt>
            {item.evidence !== "" && (
              <View style={[styles.quote, { backgroundColor: theme.cardAlt }]}>
                <Ionicons name="chatbox-ellipses-outline" size={16} color={theme.faint} />
                <Txt variant="small" style={[styles.grow, styles.italic]}>
                  “{item.evidence}”
                </Txt>
              </View>
            )}
          </Card>
        );
      })}

      {pack.next_steps.length > 0 && <NextSteps steps={pack.next_steps} />}
    </View>
  );
}

/** Things to do before the next class, ticked off on this screen. */
function NextSteps({ steps }: { steps: string[] }) {
  const theme = useTheme();
  const m = useT();
  const [done, setDone] = useState<Set<number>>(new Set());

  function toggle(i: number) {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  return (
    <Card>
      <View style={styles.stepsHeader}>
        <Txt variant="heading">{m.focus.nextSteps}</Txt>
        <Txt variant="small">
          {done.size}/{steps.length}
        </Txt>
      </View>
      {steps.map((step, i) => {
        const checked = done.has(i);
        return (
          <Pressable
            key={i}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
            onPress={() => toggle(i)}
            style={styles.step}
          >
            <Ionicons
              name={checked ? "checkmark-circle" : "ellipse-outline"}
              size={24}
              color={checked ? theme.good : theme.faint}
            />
            <Txt tone={checked ? "faint" : "ink"} style={[styles.grow, checked && styles.strike]}>
              {step}
            </Txt>
          </Pressable>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  review: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  topic: { marginTop: spacing.md },
  quote: { flexDirection: "row", gap: spacing.sm, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  italic: { fontStyle: "italic" },
  grow: { flex: 1 },
  stepsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: spacing.sm },
  step: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, paddingVertical: spacing.sm },
  strike: { textDecorationLine: "line-through" },
});
