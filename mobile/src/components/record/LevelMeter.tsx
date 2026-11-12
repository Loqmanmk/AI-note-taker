import { StyleSheet, View } from "react-native";
import { LEVEL_HISTORY } from "@/hooks/useClassRecorder";
import { useTheme } from "@/lib/theme";

const MAX_HEIGHT = 44;
const MIN_HEIGHT = 4;

/** Recent sound levels as bars, so the student can see the phone is hearing the teacher. */
export function LevelMeter({ levels, active }: { levels: number[]; active: boolean }) {
  const theme = useTheme();
  // Pad on the left so new samples always enter from the right.
  const bars = [...Array(Math.max(0, LEVEL_HISTORY - levels.length)).fill(0), ...levels];

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={active ? "Sound level" : "Sound level, not recording"}
      importantForAccessibility="no-hide-descendants"
    >
      {bars.map((level, i) => (
        <View
          key={i}
          style={[
            styles.bar,
            {
              height: MIN_HEIGHT + level * (MAX_HEIGHT - MIN_HEIGHT),
              backgroundColor: active ? theme.primary : theme.line,
              opacity: active ? 0.35 + 0.65 * (i / bars.length) : 1,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { height: MAX_HEIGHT, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3 },
  bar: { width: 4, borderRadius: 2 },
});
