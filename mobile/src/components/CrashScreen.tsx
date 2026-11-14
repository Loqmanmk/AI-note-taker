import { StyleSheet, View } from "react-native";
import { useT } from "@/i18n";
import { spacing, useTheme } from "@/lib/theme";
import { Button, IconBubble, Txt } from "./ui";

/** Shown instead of a blank screen when a screen fails to draw. */
export function CrashScreen({ onRetry }: { onRetry: () => void }) {
  const theme = useTheme();
  const m = useT();
  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]} accessibilityRole="alert">
      <IconBubble name="bandage-outline" color={theme.medium} background={theme.mediumSoft} size={64} />
      <Txt variant="title" style={styles.center}>
        {m.crash.title}
      </Txt>
      <Txt tone="muted" style={styles.center}>
        {m.crash.text}
      </Txt>
      <Button kind="primary" icon="refresh" label={m.crash.retry} onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.lg },
  center: { textAlign: "center" },
});
