import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatClock } from "@shared/transcript";
import { useT, type Messages } from "@/i18n";
import { spacing, useTheme } from "@/lib/theme";
import { Card, Txt } from "./ui";

export type ProcessingStep = { label: string; /** Seconds after the start when this step usually begins. */ startsAt: number };

/** The steps of turning a transcript into notes, in the app's language. */
export function transcriptSteps(m: Messages): ProcessingStep[] {
  return [
    { label: m.processing.reading, startsAt: 0 },
    { label: m.processing.writing, startsAt: 4 },
  ];
}

/**
 * What happens while the notes are written. The server does not report progress,
 * so steps advance on typical timings and the last one stays active until the end.
 */
export function ProcessingCard({ steps }: { steps: ProcessingStep[] }) {
  const theme = useTheme();
  const m = useT();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => setElapsed((Date.now() - started) / 1000), 500);
    return () => clearInterval(id);
  }, []);

  const current = steps.reduce((active, step, i) => (elapsed >= step.startsAt ? i : active), 0);

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Txt variant="heading">{m.processing.title}</Txt>
        <Txt variant="small" style={styles.clock}>
          {formatClock(elapsed)}
        </Txt>
      </View>

      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <View key={step.label} style={styles.step} accessibilityLiveRegion={active ? "polite" : "none"}>
            <View style={styles.icon}>
              {done && <Ionicons name="checkmark-circle" size={22} color={theme.good} />}
              {active && <ActivityIndicator color={theme.primary} />}
              {!done && !active && <Ionicons name="ellipse-outline" size={22} color={theme.line} />}
            </View>
            <Txt variant={active ? "bodyStrong" : "body"} tone={active || done ? "ink" : "faint"}>
              {step.label}
            </Txt>
          </View>
        );
      })}

      <Txt variant="small" style={styles.note}>
        {m.processing.note}
      </Txt>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: spacing.lg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: spacing.md },
  clock: { fontVariant: ["tabular-nums"] },
  step: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm },
  icon: { width: 24, alignItems: "center" },
  note: { marginTop: spacing.md },
});
