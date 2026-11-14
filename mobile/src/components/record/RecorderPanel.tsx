import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatClock } from "@shared/transcript";
import type { ClassRecorder } from "@/hooks/useClassRecorder";
import { useT } from "@/i18n";
import { formatLength } from "@/i18n/format";
import { fonts, radius, spacing, useTheme } from "@/lib/theme";
import { Card, Txt } from "../ui";
import { LevelMeter } from "./LevelMeter";
import { LostButton } from "./LostButton";
import { RecordButton } from "./RecordButton";

function StatusPill({ phase }: { phase: ClassRecorder["phase"] }) {
  const theme = useTheme();
  const m = useT();
  const look = {
    idle: { text: m.recorder.status.idle, color: theme.muted, bg: theme.cardAlt, icon: null },
    recording: { text: m.recorder.status.recording, color: theme.recording, bg: theme.highSoft, icon: "dot" as const },
    recorded: { text: m.recorder.status.recorded, color: theme.good, bg: theme.goodSoft, icon: "check" as const },
  }[phase];

  return (
    <View style={[styles.pill, { backgroundColor: look.bg }]}>
      {look.icon === "dot" && <View style={[styles.dot, { backgroundColor: look.color }]} />}
      {look.icon === "check" && <Ionicons name="checkmark-circle" size={15} color={look.color} />}
      <Text style={[styles.pillText, { color: look.color }]}>{look.text}</Text>
    </View>
  );
}

/** Warn this long before the plan's limit stops the recording. */
const WARN_BEFORE_LIMIT_SECONDS = 5 * 60;

type RecorderPanelProps = {
  recorder: ClassRecorder;
  disabled?: boolean;
  /** Replaces starting the recording, for example to explain that the month's classes are used up. */
  onStart?: () => void;
  /** The student's plan name, shown with its longest class. */
  planName?: string;
};

export function RecorderPanel({ recorder, disabled, onStart, planName }: RecorderPanelProps) {
  const theme = useTheme();
  const m = useT();
  const { phase, seconds, levels, lostCount, maxSeconds } = recorder;
  const hint = phase === "recorded" ? "" : m.recorder.hints[phase];
  const isRecording = phase === "recording";
  const remaining = maxSeconds === undefined ? Infinity : maxSeconds - seconds;
  const limitNote =
    maxSeconds === undefined
      ? ""
      : isRecording && remaining <= WARN_BEFORE_LIMIT_SECONDS
        ? m.recorder.stopsIn(formatClock(Math.max(0, remaining)), planName)
        : phase === "idle"
          ? m.recorder.upTo(formatLength(maxSeconds / 60, m), planName)
          : "";

  return (
    <Card style={styles.card}>
      <StatusPill phase={phase} />

      <Text
        style={[styles.timer, { color: theme.ink }]}
        accessibilityLabel={`${isRecording ? m.recorder.recordingTime : m.recorder.recordedTime} ${formatClock(seconds)}`}
      >
        {formatClock(seconds)}
      </Text>

      <LevelMeter levels={levels} active={isRecording} />

      {phase === "recorded" ? (
        <View style={styles.summary}>
          <Summary icon="time-outline" text={m.recorder.recordedLength(formatClock(seconds))} />
          <Summary icon="help-buoy-outline" text={m.recorder.lostMoments(lostCount)} />
        </View>
      ) : (
        <RecordButton
          recording={isRecording}
          disabled={disabled}
          onPress={isRecording ? recorder.stop : (onStart ?? recorder.start)}
        />
      )}

      {hint !== "" && (
        <Txt variant="small" style={styles.hint}>
          {hint}
        </Txt>
      )}

      {limitNote !== "" && (
        <Txt variant="small" color={isRecording ? theme.lostInk : undefined} style={styles.hint}>
          {limitNote}
        </Txt>
      )}

      {isRecording && (
        <View style={styles.lost}>
          <LostButton count={lostCount} onMark={recorder.markLost} />
        </View>
      )}
    </Card>
  );
}

function Summary({ icon, text }: { icon: "time-outline" | "help-buoy-outline"; text: string }) {
  const theme = useTheme();
  return (
    <View style={styles.summaryItem}>
      <Ionicons name={icon} size={18} color={theme.muted} />
      <Txt variant="label" tone="muted">
        {text}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: "center", paddingVertical: spacing.xl },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  pillText: { fontFamily: fonts.bold, fontSize: 13 },
  timer: {
    fontFamily: fonts.extrabold,
    fontSize: 56,
    lineHeight: 64,
    letterSpacing: -1,
    fontVariant: ["tabular-nums"],
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  summary: { flexDirection: "row", gap: spacing.lg, marginTop: spacing.lg },
  summaryItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  hint: { textAlign: "center", paddingHorizontal: spacing.sm, maxWidth: 320 },
  lost: { alignSelf: "stretch", marginTop: spacing.xl },
});
