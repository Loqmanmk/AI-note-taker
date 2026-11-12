import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatClock } from "@shared/transcript";
import { Txt } from "@/components/ui";
import { fonts, radius, spacing, useTheme } from "@/lib/theme";

type LostButtonProps = {
  count: number;
  /** Marks the moment and returns its time in seconds. */
  onMark: () => number;
};

/** The "I'm lost" button, with a short confirmation of the moment that was marked. */
export function LostButton({ count, onMark }: LostButtonProps) {
  const theme = useTheme();
  const [confirmation, setConfirmation] = useState("");
  const [fade] = useState(() => new Animated.Value(0));
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function press() {
    const seconds = onMark();
    setConfirmation(`Marked at ${formatClock(seconds)}. It will be re-explained.`);
    fade.setValue(1);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      Animated.timing(fade, { toValue: 0, duration: 400, useNativeDriver: true }).start();
    }, 1800);
  }

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="I'm lost"
        accessibilityHint="Marks this moment so it gets re-explained after class"
        onPress={press}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: theme.lost, transform: [{ scale: pressed ? 0.97 : 1 }] },
        ]}
      >
        <Ionicons name="help-buoy" size={26} color="#FFFFFF" />
        <Text style={styles.label}>I’m lost</Text>
        {count > 0 && (
          <View style={styles.count}>
            <Text style={[styles.countText, { color: theme.lost }]}>{count}</Text>
          </View>
        )}
      </Pressable>
      <Animated.View style={{ opacity: fade }} accessibilityLiveRegion="polite">
        <Txt variant="small" color={theme.lostInk} style={styles.confirmation}>
          {confirmation || " "}
        </Txt>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 64,
    borderRadius: radius.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    boxShadow: "0px 8px 20px rgba(232, 89, 12, 0.30)",
  },
  // Large bold type: white on this orange meets the 3:1 contrast for large text.
  label: { color: "#FFFFFF", fontFamily: fonts.extrabold, fontSize: 21 },
  count: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  countText: { fontFamily: fonts.extrabold, fontSize: 14 },
  confirmation: { textAlign: "center", marginTop: spacing.sm },
});
