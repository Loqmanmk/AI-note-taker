import { Pressable, StyleSheet, Text, View } from "react-native";
import { useKeepAwake } from "expo-keep-awake";
import { formatClock } from "@shared/transcript";
import type { ClassRecorder } from "@/hooks/useClassRecorder";
import { radius, spacing, useTheme } from "@/lib/theme";
import { Button, Card, Txt } from "./ui";

/** Keeps the screen on, so the phone does not lock and cut the recording. */
function KeepScreenOn() {
  useKeepAwake();
  return null;
}

export function RecorderCard({ recorder }: { recorder: ClassRecorder }) {
  const theme = useTheme();
  const { phase, seconds, lostCount } = recorder;
  const isRecording = phase === "recording";

  return (
    <Card>
      {isRecording && <KeepScreenOn />}

      <View style={styles.bar}>
        <View style={[styles.dot, { backgroundColor: isRecording ? theme.high : theme.line }]} />
        <Text style={[styles.timer, { color: theme.ink }]} accessibilityLabel={`Recorded time ${formatClock(seconds)}`}>
          {formatClock(seconds)}
        </Text>
        <View style={styles.grow} />
        {phase === "idle" && <Button kind="primary" label="Start recording" onPress={recorder.start} />}
        {isRecording && <Button label="Stop" onPress={recorder.stop} />}
      </View>

      <Txt variant="muted" style={styles.hint}>
        {phase === "idle" && "Put your phone near the teacher. Make sure you are allowed to record this class."}
        {isRecording && "Recording. Keep the app open; the screen will stay on."}
        {phase === "recorded" && "Recording finished. Create your notes below, or discard it."}
      </Txt>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !isRecording }}
        disabled={!isRecording}
        onPress={recorder.markLost}
        style={({ pressed }) => [
          styles.lost,
          { borderColor: theme.lost, backgroundColor: theme.lost + "1a", opacity: !isRecording ? 0.45 : pressed ? 0.6 : 1 },
        ]}
      >
        <Text style={[styles.lostTitle, { color: theme.lost }]}>I’m lost</Text>
        <Txt variant="small" style={styles.center}>
          {lostCount
            ? `${lostCount} moment${lostCount > 1 ? "s" : ""} marked. They will be re-explained after class.`
            : "Tap when you stop following. That moment gets re-explained after class."}
        </Txt>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 48 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  timer: { fontSize: 22, fontWeight: "600", fontVariant: ["tabular-nums"] },
  grow: { flex: 1 },
  hint: { marginVertical: spacing.md },
  lost: { borderWidth: 2, borderRadius: radius.md, padding: spacing.lg, alignItems: "center" },
  lostTitle: { fontSize: 20, fontWeight: "700", marginBottom: 2 },
  center: { textAlign: "center" },
});
