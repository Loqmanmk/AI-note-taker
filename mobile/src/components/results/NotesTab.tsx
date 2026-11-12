import { StyleSheet, View } from "react-native";
import type { StudyPack } from "@shared/schema";
import { Card, Txt } from "@/components/ui";
import { spacing } from "@/lib/theme";

export function NotesTab({ pack }: { pack: StudyPack }) {
  return (
    <View>
      {pack.notes.map((section, i) => (
        <Card key={i}>
          <Txt variant="heading">{section.heading}</Txt>
          {section.points.map((point, j) => (
            <Txt key={j} style={styles.point}>
              • {point}
            </Txt>
          ))}
        </Card>
      ))}

      {pack.key_terms.length > 0 && (
        <Card>
          <Txt variant="heading">Key terms</Txt>
          {pack.key_terms.map((entry, i) => (
            <View key={i} style={styles.term}>
              <Txt style={styles.bold}>{entry.term}</Txt>
              <Txt variant="muted">{entry.definition}</Txt>
            </View>
          ))}
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  point: { marginTop: spacing.xs },
  term: { marginTop: spacing.sm },
  bold: { fontWeight: "600" },
});
