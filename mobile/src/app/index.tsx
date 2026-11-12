import { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { NOTE_LANGUAGES, type NoteLanguage } from "@shared/constants";
import { SAMPLE_TRANSCRIPT } from "@shared/sample";
import type { NotesResponse } from "@shared/schema";
import { Chips } from "@/components/Chips";
import { HistoryList } from "@/components/HistoryList";
import { RecorderCard } from "@/components/RecorderCard";
import { Button, Txt } from "@/components/ui";
import { useClassHistory } from "@/hooks/useClassHistory";
import { useClassRecorder } from "@/hooks/useClassRecorder";
import { requestStudyPackFromRecording, requestStudyPackFromTranscript } from "@/lib/api";
import { classStore } from "@/lib/classStore";
import { spacing, useTheme } from "@/lib/theme";

const LANGUAGE_OPTIONS = Object.entries(NOTE_LANGUAGES) as [NoteLanguage, string][];

function newClassId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const recorder = useClassRecorder();
  const history = useClassHistory();

  const [language, setLanguage] = useState<NoteLanguage>("auto");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /** Runs a request for notes, saves the result and opens it. */
  async function createNotes(request: () => Promise<NotesResponse>): Promise<boolean> {
    setLoading(true);
    setError("");
    try {
      const { pack, demo } = await request();
      const saved = { id: newClassId(), date: new Date().toISOString(), pack, demo };
      classStore.add(saved);
      router.push({ pathname: "/class/[id]", params: { id: saved.id } });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function createFromRecording() {
    const recording = recorder.recording;
    if (!recording) return;
    // The recording is only discarded once the notes exist, so a failed upload can be retried.
    if (await createNotes(() => requestStudyPackFromRecording(recording, language))) recorder.discard();
  }

  function confirmDiscard() {
    Alert.alert("Discard this recording?", "The audio will be lost.", [
      { text: "Keep", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: recorder.discard },
    ]);
  }

  const shownError = error || recorder.error;

  return (
    <ScrollView contentContainerStyle={styles.screen} contentInsetAdjustmentBehavior="automatic">
      <Txt variant="title">Record your class. Know what to study.</Txt>
      <Txt variant="muted" style={styles.lede}>
        FocusNotes listens to your teacher, writes your notes, and tells you what matters most for the exam.
      </Txt>

      <RecorderCard recorder={recorder} />

      <Txt variant="small">Notes language</Txt>
      <Chips label="Notes language" options={LANGUAGE_OPTIONS} selected={language} onSelect={setLanguage} />

      {recorder.phase === "recorded" && !loading && (
        <View style={styles.actions}>
          <Button label="Discard" onPress={confirmDiscard} />
          <Button kind="primary" label="Create my notes" onPress={createFromRecording} style={styles.grow} />
        </View>
      )}

      {loading && (
        <View style={styles.loading} accessibilityLiveRegion="polite">
          <ActivityIndicator color={theme.accent} />
          <Txt variant="muted" style={styles.grow}>
            Writing your notes. This usually takes about a minute, longer for a long class.
          </Txt>
        </View>
      )}

      {shownError !== "" && (
        <View style={[styles.error, { backgroundColor: theme.high + "1a" }]} accessibilityRole="alert">
          <Txt style={{ color: theme.high }}>{shownError}</Txt>
        </View>
      )}

      {recorder.phase === "idle" && !loading && (
        <Button
          kind="link"
          label="Try with an example class (no recording)"
          onPress={() => createNotes(() => requestStudyPackFromTranscript(SAMPLE_TRANSCRIPT, language))}
        />
      )}

      <HistoryList
        items={history.items}
        onOpen={(id) => router.push({ pathname: "/class/[id]", params: { id } })}
        onDelete={history.remove}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: spacing.lg, paddingBottom: 60 },
  lede: { marginTop: spacing.sm, marginBottom: spacing.xl },
  actions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
  grow: { flex: 1 },
  loading: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.lg },
  error: { borderRadius: 10, padding: spacing.md, marginTop: spacing.md },
});
