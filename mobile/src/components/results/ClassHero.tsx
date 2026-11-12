import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { formatRelativeDay } from "@shared/format";
import type { SavedClass } from "@shared/schema";
import { fonts, radius, spacing, useTheme } from "@/lib/theme";

/** The coloured header of a class: subject, title, date, and what is inside. */
export function ClassHero({ saved }: { saved: SavedClass }) {
  const theme = useTheme();
  const { pack } = saved;
  const keyTopics = pack.focus.filter((f) => f.priority === "high").length;

  const stats = [
    { value: keyTopics, label: keyTopics === 1 ? "key topic" : "key topics" },
    { value: pack.quiz.length, label: pack.quiz.length === 1 ? "question" : "questions" },
    { value: pack.lost_moments.length, label: "re-explained" },
  ];

  return (
    <LinearGradient
      colors={[theme.gradient[0], theme.gradient[1]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      <View style={styles.meta}>
        <View style={styles.subject}>
          <Text style={styles.subjectText}>{pack.subject}</Text>
        </View>
        <Text style={styles.date}>{formatRelativeDay(saved.date)}</Text>
      </View>

      <Text style={styles.title} accessibilityRole="header">
        {pack.title}
      </Text>

      <View style={styles.stats}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.stat}>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>
    </LinearGradient>
  );
}

const white = "#FFFFFF";

const styles = StyleSheet.create({
  hero: { borderRadius: radius.xl, padding: spacing.xl, gap: spacing.md },
  meta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  subject: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  subjectText: { color: white, fontFamily: fonts.bold, fontSize: 13 },
  date: { color: white, fontFamily: fonts.semibold, fontSize: 13 },
  title: { color: white, fontFamily: fonts.extrabold, fontSize: 26, lineHeight: 32, letterSpacing: -0.5 },
  stats: {
    flexDirection: "row",
    marginTop: spacing.xs,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.25)",
  },
  stat: { flex: 1 },
  statValue: { color: white, fontFamily: fonts.extrabold, fontSize: 22 },
  statLabel: { color: white, fontFamily: fonts.medium, fontSize: 13 },
});
