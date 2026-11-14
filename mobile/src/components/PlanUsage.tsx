import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { PlanStatus } from "@shared/plans";
import { useT } from "@/i18n";
import { planName, resetDate } from "@/i18n/format";
import { radius, spacing, useTheme } from "@/lib/theme";
import { ProgressBar, Txt, forwardChevron } from "./ui";

/** "Free · 2 of 3 classes this month", with a bar. Opens the plans when tapped. */
export function PlanUsage({ status, onPress }: { status: PlanStatus; onPress?: () => void }) {
  const theme = useTheme();
  const m = useT();
  const name = planName(status.plan, m);
  const used = Math.min(status.classesUsed, status.classesPerMonth);
  const full = used >= status.classesPerMonth;
  const color = full ? theme.high : used / status.classesPerMonth >= 0.8 ? theme.medium : theme.primary;
  const resets = resetDate();
  const label = m.plans.usageLabel(name, used, status.classesPerMonth);

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={onPress ? `${label}. ${m.plans.seePlans}` : label}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.box,
        { backgroundColor: theme.card, borderColor: full ? theme.high : theme.line, opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <View style={styles.top}>
        <Txt variant="label">{name}</Txt>
        <Txt variant="small" style={styles.grow}>
          {m.plans.usage(used, status.classesPerMonth)}
        </Txt>
        {onPress && <Ionicons name={forwardChevron()} size={18} color={theme.faint} />}
      </View>
      <ProgressBar value={used / status.classesPerMonth} color={color} />
      {full && (
        <Txt variant="small" color={theme.high}>
          {status.plan === "pro" ? m.plans.resetsPro(resets) : m.plans.resets(resets)}
        </Txt>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  top: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  grow: { flex: 1 },
});
