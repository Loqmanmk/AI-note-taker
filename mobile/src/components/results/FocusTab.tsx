import { StyleSheet, Text, View } from "react-native";
import type { StudyPack } from "@shared/schema";
import { Card, Txt } from "@/components/ui";
import { spacing, useTheme } from "@/lib/theme";

type FocusTabProps = {
  pack: StudyPack;
  /** Focus topics the student got wrong in the quiz. */
  missedTopics: string[];
};

export function FocusTab({ pack, missedTopics }: FocusTabProps) {
  const theme = useTheme();
  const priorityColor = { high: theme.high, medium: theme.medium, low: theme.low };

  return (
    <View>
      {missedTopics.length > 0 && (
        <Card style={{ borderColor: theme.lost }}>
          <Txt variant="heading">Review again</Txt>
          <Txt>You missed quiz questions on: {missedTopics.join(", ")}.</Txt>
        </Card>
      )}

      {pack.focus.length === 0 && <Txt variant="muted">No clear priorities came out of this class.</Txt>}
      {pack.focus.map((item, i) => (
        <Card key={i} style={{ borderLeftWidth: 4, borderLeftColor: priorityColor[item.priority] }}>
          <Text style={[styles.pill, { color: priorityColor[item.priority] }]}>{item.priority} priority</Text>
          <Txt variant="heading">{item.topic}</Txt>
          <Txt>{item.why}</Txt>
          {item.evidence !== "" && (
            <View style={[styles.quote, { borderLeftColor: theme.line }]}>
              <Txt variant="muted" style={styles.italic}>
                “{item.evidence}”
              </Txt>
            </View>
          )}
        </Card>
      ))}

      {pack.next_steps.length > 0 && (
        <Card>
          <Txt variant="heading">Before the next class</Txt>
          {pack.next_steps.map((step, i) => (
            <Txt key={i} style={styles.step}>
              • {step}
            </Txt>
          ))}
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: spacing.xs },
  quote: { borderLeftWidth: 2, paddingLeft: spacing.md, marginTop: spacing.sm },
  italic: { fontStyle: "italic" },
  step: { marginTop: spacing.xs },
});
