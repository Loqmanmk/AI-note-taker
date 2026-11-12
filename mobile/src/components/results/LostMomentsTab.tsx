import { StyleSheet, Text, View } from "react-native";
import type { StudyPack } from "@shared/schema";
import { Card, Txt } from "@/components/ui";
import { spacing, useTheme } from "@/lib/theme";

export function LostMomentsTab({ moments }: { moments: StudyPack["lost_moments"] }) {
  const theme = useTheme();
  if (moments.length === 0) {
    return (
      <Txt variant="muted">
        No moments marked. Press “I’m lost” while recording and that part will be re-explained here.
      </Txt>
    );
  }

  return (
    <View>
      {moments.map((moment, i) => (
        <Card key={i}>
          <Text style={[styles.pill, { color: theme.lost }]}>Moment {moment.marker}</Text>
          <Txt variant="heading">What the teacher was saying</Txt>
          <Txt>{moment.what_was_said}</Txt>
          <Txt variant="heading" style={styles.second}>
            In simpler words
          </Txt>
          <Txt>{moment.simple_explanation}</Txt>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: spacing.xs },
  second: { marginTop: spacing.md },
});
