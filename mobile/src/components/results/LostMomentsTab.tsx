import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { StudyPack } from "@shared/schema";
import { Badge, Card, IconBubble, Txt } from "@/components/ui";
import { radius, spacing, useTheme } from "@/lib/theme";

export function LostMomentsTab({ moments }: { moments: StudyPack["lost_moments"] }) {
  const theme = useTheme();

  if (moments.length === 0) {
    return (
      <Card style={styles.empty}>
        <IconBubble name="help-buoy-outline" color={theme.lostInk} background={theme.lostSoft} size={52} />
        <Txt variant="heading" style={styles.center}>
          No lost moments this time
        </Txt>
        <Txt variant="small" style={styles.center}>
          Next class, tap “I’m lost” whenever you stop following. That part will be re-explained here.
        </Txt>
      </Card>
    );
  }

  return (
    <View>
      {moments.map((moment, i) => (
        <Card key={i}>
          <Badge label={`Moment ${moment.marker}`} icon="help-buoy" color={theme.lostInk} background={theme.lostSoft} />

          <Txt variant="caption" style={styles.label}>
            What the teacher said
          </Txt>
          <Txt tone="muted">{moment.what_was_said}</Txt>

          <Ionicons name="arrow-down" size={18} color={theme.faint} style={styles.arrow} />

          <View style={[styles.simple, { backgroundColor: theme.primarySoft }]}>
            <View style={styles.simpleTitle}>
              <Ionicons name="bulb" size={18} color={theme.primary} />
              <Txt variant="bodyStrong" color={theme.primary}>
                In simpler words
              </Txt>
            </View>
            <Txt>{moment.simple_explanation}</Txt>
          </View>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl },
  center: { textAlign: "center" },
  label: { marginTop: spacing.lg, marginBottom: spacing.xs },
  arrow: { alignSelf: "center", marginVertical: spacing.sm },
  simple: { borderRadius: radius.md, padding: spacing.lg, gap: spacing.sm },
  simpleTitle: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
