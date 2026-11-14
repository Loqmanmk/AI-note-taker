import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PLANS, formatMinutes, nextMonthStart } from "@shared/plans";
import { SAMPLE_TRANSCRIPT } from "@shared/sample";
import type { NotesResponse } from "@shared/schema";
import { AccountButton } from "@/components/AccountButton";
import { HistoryList } from "@/components/HistoryList";
import { LanguagePicker } from "@/components/LanguagePicker";
import { PlanUsage } from "@/components/PlanUsage";
import { ProcessingCard, TRANSCRIPT_STEPS, type ProcessingStep } from "@/components/ProcessingCard";
import { RecorderPanel } from "@/components/record/RecorderPanel";
import { ServerStatusBanner } from "@/components/ServerStatusBanner";
import { Button, IconBubble, IconButton, Txt } from "@/components/ui";
import { useClassHistory } from "@/hooks/useClassHistory";
import { useClassRecorder } from "@/hooks/useClassRecorder";
import { useNoteLanguage } from "@/hooks/useNoteLanguage";
import { usePlan } from "@/hooks/usePlan";
import { useSendQueue } from "@/hooks/useSendQueue";
import { useServerStatus } from "@/hooks/useServerStatus";
import { requestStudyPackFromTranscript } from "@/lib/api";
import { classStore } from "@/lib/classStore";
import { confirmAction, confirmDestructive } from "@/lib/confirm";
import { ensureNotificationPermission } from "@/lib/notifications";
import { sendQueue } from "@/lib/sendQueue";
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
  const plan = usePlan();
  const planName = plan.status ? PLANS[plan.status.plan].name : undefined;
  // The plan's longest class; the recording stops there by itself.
  const recorder = useClassRecorder(plan.status ? plan.status.maxRecordingMinutes * 60 : undefined);
  const history = useClassHistory();
  const queue = useSendQueue();
  const server = useServerStatus();
  const [language, setLanguage] = useNoteLanguage();

  const [processing, setProcessing] = useState<ProcessingStep[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

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

  /**
   * Hands the recording to the send queue, which keeps it on the phone until its notes are saved.
   * The student is free at once: the class shows in the list while its notes are written.
   */
  async function createFromRecording() {
    const recording = recorder.recording;
    if (!recording) return;
    setError("");
    await ensureNotificationPermission();
    await sendQueue.add({
      uri: recording.uri,
      lostTimes: recording.lostTimes,
      durationSeconds: recorder.seconds,
      language,
    });
    recorder.release();
    setNotice("Your notes are being written. You can close the app: we will tell you when they are ready.");
  }

  /** Starts recording, unless the month's classes are used up: then explains and offers the plans. */
  function startRecording() {
    if (!plan.limitReached || !plan.status) {
      recorder.start();
      return;
    }
    const resets = nextMonthStart().toLocaleDateString(undefined, { day: "numeric", month: "long" });
    const isPro = plan.status.plan === "pro";
    confirmAction({
      title: "No classes left this month",
      message: isPro
        ? `You have used your ${plan.status.classesPerMonth} classes this month. They come back on ${resets}.`
        : `You have used your ${plan.status.classesPerMonth} ${planName} classes this month. Upgrade to record more, or wait until ${resets}.`,
      confirmLabel: isPro ? "OK" : "See plans",
      cancelLabel: "Not now",
      onConfirm: () => {
        if (!isPro) router.push("/plans");
      },
    });
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

      {plan.status && recorder.phase === "idle" && !busy && (
        <View style={styles.usage}>
          <PlanUsage status={plan.status} onPress={() => router.push("/plans")} />
        </View>
      )}

      {notice !== "" && recorder.phase === "idle" && (
        <View style={[styles.notice, { backgroundColor: theme.goodSoft }]} accessibilityRole="alert">
          <IconBubble name="checkmark-circle" color={theme.good} background={theme.card} size={32} />
          <Txt variant="small" color={theme.good} style={styles.grow}>
            {notice}
          </Txt>
          <IconButton icon="close" label="Hide this message" onPress={() => setNotice("")} color={theme.good} />
        </View>
      )}

      <RecorderPanel recorder={recorder} disabled={busy} onStart={startRecording} planName={planName} />

      {recorder.phase === "recorded" && recorder.stoppedAtLimit && recorder.maxSeconds !== undefined && (
        <View style={[styles.notice, styles.limitNotice, { backgroundColor: theme.mediumSoft }]} accessibilityRole="alert">
          <IconBubble name="timer-outline" color={theme.medium} background={theme.card} size={32} />
          <View style={styles.grow}>
            <Txt variant="small" color={theme.medium}>
              {`Recording stopped at ${formatMinutes(recorder.maxSeconds / 60)}, the longest class on ${planName ?? "your plan"}. Your notes will cover this part.`}
            </Txt>
            <Button kind="ghost" label="See longer plans" onPress={() => router.push("/plans")} style={styles.inlineLink} />
          </View>
        </View>
      )}

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
          queued={queue.entries}
          onRetrySend={queue.retry}
          onDiscardSend={queue.discard}
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
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  grow: { flex: 1 },
  usage: { marginTop: -spacing.md, marginBottom: spacing.lg },
  limitNotice: { marginTop: spacing.lg, marginBottom: 0, alignItems: "flex-start" },
  inlineLink: { alignSelf: "flex-start", minHeight: 36, paddingHorizontal: 0, marginTop: spacing.xs },
});
