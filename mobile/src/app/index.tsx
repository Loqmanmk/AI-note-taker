import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SAMPLE_TRANSCRIPT } from "@shared/sample";
import type { NotesResponse } from "@shared/schema";
import { AccountButton } from "@/components/AccountButton";
import { HistoryList } from "@/components/HistoryList";
import { LanguagePicker } from "@/components/LanguagePicker";
import { ProcessingCard, RECORDING_STEPS, TRANSCRIPT_STEPS, type ProcessingStep } from "@/components/ProcessingCard";
import { RecorderPanel } from "@/components/record/RecorderPanel";
import { ServerStatusBanner } from "@/components/ServerStatusBanner";
import { Button, IconBubble, Txt } from "@/components/ui";
import { useClassHistory } from "@/hooks/useClassHistory";
import { useClassRecorder } from "@/hooks/useClassRecorder";
import { useNoteLanguage } from "@/hooks/useNoteLanguage";
import { useServerStatus } from "@/hooks/useServerStatus";
import { requestStudyPackFromRecording, requestStudyPackFromTranscript } from "@/lib/api";
import { classStore } from "@/lib/classStore";
import { confirmDestructive } from "@/lib/confirm";
import { radius, spacing, useTheme } from "@/lib/theme";

function newClassId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function greeting(now = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const recorder = useClassRecorder();
  const history = useClassHistory();
  const server = useServerStatus();
  const [language, setLanguage] = useNoteLanguage();

  const [processing, setProcessing] = useState<ProcessingStep[] | null>(null);
  const [error, setError] = useState("");

  /** Runs a request for notes, saves the result and opens it. */
  async function createNotes(steps: ProcessingStep[], request: () => Promise<NotesResponse>): Promise<boolean> {
    setProcessing(steps);
    setError("");
    try {
      const { pack, demo, classId } = await request();
      // The server returns the id it saved the class under in the student's account.
      const saved = { id: classId ?? newClassId(), date: new Date().toISOString(), pack, demo };
      classStore.add(saved);
      router.push({ pathname: "/class/[id]", params: { id: saved.id } });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      server.retry();
      return false;
    } finally {
      setProcessing(null);
    }
  }

  async function createFromRecording() {
    const recording = recorder.recording;
    if (!recording) return;
    // The recording is only discarded once the notes exist, so a failed upload can be retried.
    const created = await createNotes(RECORDING_STEPS, () => requestStudyPackFromRecording(recording, language));
    if (created) recorder.discard();
  }

  function tryExample() {
    createNotes(TRANSCRIPT_STEPS, () => requestStudyPackFromTranscript(SAMPLE_TRANSCRIPT, language));
  }

  function confirmDiscard() {
    confirmDestructive({
      title: "Discard this recording?",
      message: "The audio will be deleted and cannot be recovered.",
      confirmLabel: "Discard",
      cancelLabel: "Keep it",
      onConfirm: recorder.discard,
    });
  }

  const busy = processing !== null;
  const shownError = error || recorder.error;
  const title = busy
    ? "Writing your notes"
    : { idle: "Ready for class?", recording: "Listening to your class", recorded: "Your recording is ready" }[
        recorder.phase
      ];

  return (
    <ScrollView
      contentContainerStyle={[styles.screen, { paddingTop: insets.top + spacing.lg }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.brand}>
        <LinearGradient colors={[theme.gradient[0], theme.gradient[1]]} style={styles.logo}>
          <Ionicons name="sparkles" size={18} color="#FFFFFF" />
        </LinearGradient>
        <Txt variant="label" tone="muted" style={styles.grow}>
          FocusNotes
        </Txt>
        <AccountButton />
      </View>

      <Txt variant="small" style={styles.greeting}>
        {greeting()}
      </Txt>
      <Txt variant="display" style={styles.title}>
        {title}
      </Txt>

      <ServerStatusBanner status={server.status} onRetry={server.retry} />

      <RecorderPanel recorder={recorder} disabled={busy} />

      {recorder.phase === "recorded" && !busy && (
        <View style={styles.next}>
          <LanguagePicker value={language} onChange={setLanguage} />
          <Button kind="primary" icon="sparkles" label="Create my notes" onPress={createFromRecording} />
          <Button kind="ghost" icon="trash-outline" label="Discard recording" onPress={confirmDiscard} />
        </View>
      )}

      {processing && <ProcessingCard steps={processing} />}

      {shownError !== "" && !busy && (
        <View style={[styles.error, { backgroundColor: theme.highSoft }]} accessibilityRole="alert">
          <IconBubble name="alert-circle" color={theme.high} background={theme.card} size={32} />
          <Txt variant="small" color={theme.high} style={styles.grow}>
            {shownError}
          </Txt>
        </View>
      )}

      {recorder.phase !== "recording" && !busy && (
        <HistoryList
          items={history.items}
          status={history.status}
          onRetry={history.reload}
          onOpen={(id) => router.push({ pathname: "/class/[id]", params: { id } })}
          onDelete={history.remove}
          onTryExample={tryExample}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: spacing.lg, paddingBottom: 64 },
  brand: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.xl },
  logo: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  greeting: { marginBottom: 2 },
  title: { marginBottom: spacing.xl },
  next: { gap: spacing.md, marginTop: spacing.sm },
  error: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  grow: { flex: 1 },
});
