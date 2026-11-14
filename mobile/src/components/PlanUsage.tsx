import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PLANS, nextMonthStart, type PlanStatus } from "@shared/plans";
import { radius, spacing, useTheme } from "@/lib/theme";
import { ProgressBar, Txt } from "./ui";

/** "Free · 2 of 3 classes this month", with a bar. Opens the plans when tapped. */
export function PlanUsage({ status, onPress }: { status: PlanStatus; onPress?: () => void }) {
  const theme = useTheme();
  const plan = PLANS[status.plan];
  const used = Math.min(status.classesUsed, status.classesPerMonth);
  const full = used >= status.classesPerMonth;
  const color = full ? theme.high : used / status.classesPerMonth >= 0.8 ? theme.medium : theme.primary;
  const resets = nextMonthStart().toLocaleDateString(undefined, { day: "numeric", month: "long" });
  const label = `${plan.name} plan: ${used} of ${status.classesPerMonth} classes used this month`;

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={onPress ? `${label}. See plans` : label}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.box,
        { backgroundColor: theme.card, borderColor: full ? theme.high : theme.line, opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <View style={styles.top}>
        <Txt variant="label">{plan.name}</Txt>
        <Txt variant="small" style={styles.grow}>
          {used} of {status.classesPerMonth} classes this month
        </Txt>
        {onPress && <Ionicons name="chevron-forward" size={18} color={theme.faint} />}
      </View>
      <ProgressBar value={used / status.classesPerMonth} color={color} />
      {full && (
        <Txt variant="small" color={theme.high}>
          {status.plan === "pro" ? `Your classes come back on ${resets}.` : `Upgrade for more classes, or wait until ${resets}.`}
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
