import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatMinutes } from "@shared/plans";
import { formatClock } from "@shared/transcript";
import type { ClassRecorder } from "@/hooks/useClassRecorder";
import { fonts, radius, spacing, useTheme } from "@/lib/theme";
import { Card, Txt } from "../ui";
import { LevelMeter } from "./LevelMeter";
import { LostButton } from "./LostButton";
import { RecordButton } from "./RecordButton";

function StatusPill({ phase }: { phase: ClassRecorder["phase"] }) {
  const theme = useTheme();
  const look = {
    idle: { text: "Ready to record", color: theme.muted, bg: theme.cardAlt, icon: null },
    recording: { text: "Recording", color: theme.recording, bg: theme.highSoft, icon: "dot" as const },
    recorded: { text: "Recording saved", color: theme.good, bg: theme.goodSoft, icon: "check" as const },
  }[phase];

  return (
    <View style={[styles.pill, { backgroundColor: look.bg }]}>
      {look.icon === "dot" && <View style={[styles.dot, { backgroundColor: look.color }]} />}
      {look.icon === "check" && <Ionicons name="checkmark-circle" size={15} color={look.color} />}
      <Text style={[styles.pillText, { color: look.color }]}>{look.text}</Text>
    </View>
  );
}

const HINTS = {
  idle: "Put your phone near the teacher and tap to start. Check that you are allowed to record this class.",
  recording: "You can lock your phone or use other apps: recording continues.",
  recorded: "",
};

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
  const { phase, seconds, levels, lostCount, maxSeconds } = recorder;
  const isRecording = phase === "recording";
  const remaining = maxSeconds === undefined ? Infinity : maxSeconds - seconds;
  const limitNote =
    maxSeconds === undefined
      ? ""
      : isRecording && remaining <= WARN_BEFORE_LIMIT_SECONDS
        ? `Recording stops in ${formatClock(Math.max(0, remaining))}, the longest class${planName ? ` on ${planName}` : ""}.`
        : phase === "idle"
          ? `Up to ${formatMinutes(maxSeconds / 60)} per class${planName ? ` on ${planName}` : ""}.`
          : "";

  return (
    <Card style={styles.card}>
      <StatusPill phase={phase} />

      <Text
        style={[styles.timer, { color: theme.ink }]}
        accessibilityLabel={`${isRecording ? "Recording time" : "Recorded time"} ${formatClock(seconds)}`}
      >
        {formatClock(seconds)}
      </Text>

      <LevelMeter levels={levels} active={isRecording} />

      {phase === "recorded" ? (
        <View style={styles.summary}>
          <Summary icon="time-outline" text={`${formatClock(seconds)} recorded`} />
          <Summary
            icon="help-buoy-outline"
            text={lostCount ? `${lostCount} lost moment${lostCount > 1 ? "s" : ""}` : "No lost moments"}
          />
        </View>
      ) : (
        <RecordButton
          recording={isRecording}
          disabled={disabled}
          onPress={isRecording ? recorder.stop : (onStart ?? recorder.start)}
        />
      )}

      {HINTS[phase] !== "" && (
        <Txt variant="small" style={styles.hint}>
          {HINTS[phase]}
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
