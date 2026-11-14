import { useState } from "react";
import { LayoutAnimation, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { StudyPack } from "@shared/schema";
import { Card, SectionHeader, Txt } from "@/components/ui";
import { useT } from "@/i18n";
import { radius, spacing, useTheme } from "@/lib/theme";

export function NotesTab({ pack }: { pack: StudyPack }) {
  const m = useT();
  return (
    <View>
      {pack.notes.map((section, i) => (
        <NoteSection key={i} heading={section.heading} points={section.points} />
      ))}

      {pack.key_terms.length > 0 && (
        <View style={styles.terms}>
          <SectionHeader title={m.notes.keyTerms} detail={m.notes.tapCard} />
          {pack.key_terms.map((entry, i) => (
            <Flashcard key={i} term={entry.term} definition={entry.definition} />
          ))}
        </View>
      )}
    </View>
  );
}

/** A heading that opens and closes its bullet points. */
function NoteSection({ heading, points }: { heading: string; points: string[] }) {
  const theme = useTheme();
  const [open, setOpen] = useState(true);

  return (
    <Card style={styles.section}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setOpen((value) => !value);
        }}
        style={styles.sectionHeader}
      >
        <Txt variant="heading" style={styles.grow}>
          {heading}
        </Txt>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={20} color={theme.muted} />
      </Pressable>
      {open &&
        points.map((point, j) => (
          <View key={j} style={styles.point}>
            <View style={[styles.bullet, { backgroundColor: theme.primary }]} />
            <Txt style={styles.grow}>{point}</Txt>
          </View>
        ))}
    </Card>
  );
}

/** Shows a term; tapping reveals its definition, like a revision card. */
function Flashcard({ term, definition }: { term: string; definition: string }) {
  const theme = useTheme();
  const m = useT();
  const [revealed, setRevealed] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={revealed ? m.notes.hideDefinition : m.notes.showDefinition}
      onPress={() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setRevealed((value) => !value);
      }}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: revealed ? theme.primarySoft : theme.card,
          borderColor: revealed ? theme.primary : theme.line,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <View style={styles.cardTop}>
        <Txt variant="bodyStrong" color={revealed ? theme.primary : undefined} style={styles.grow}>
          {term}
        </Txt>
        <Ionicons name={revealed ? "eye-off-outline" : "eye-outline"} size={18} color={theme.muted} />
      </View>
      {revealed && <Txt style={styles.definition}>{definition}</Txt>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { paddingVertical: spacing.md },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 36 },
  point: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 9 },
  grow: { flex: 1 },
  terms: { marginTop: spacing.lg },
  card: { borderWidth: 1, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm },
  cardTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  definition: { marginTop: spacing.sm },
});
