import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { pickIndex } from "@shared/format";
import type { SavedClass } from "@shared/schema";
import { formatClock } from "@shared/transcript";
import type { ClassListStatus } from "@/lib/classStore";
import { confirmDestructive, showMessage } from "@/lib/confirm";
import type { QueueEntry } from "@/lib/sendQueue";
import { useT } from "@/i18n";
import { relativeDay } from "@/i18n/format";
import { fonts, radius, spacing, useTheme } from "@/lib/theme";
import { Button, IconBubble, SectionHeader, Txt, forwardChevron } from "./ui";

type HistoryListProps = {
  items: SavedClass[];
  /** Recordings waiting for their notes. */
  queued: QueueEntry[];
  onRetrySend: (id: string) => void;
  onDiscardSend: (id: string) => void;
  status: ClassListStatus;
  onRetry: () => void;
  onOpen: (id: string) => void;
  /** Rejects with an Error safe to show when the class could not be deleted. */
  onDelete: (id: string) => Promise<void>;
  onTryExample: () => void;
};

export function HistoryList(props: HistoryListProps) {
  const m = useT();
  const { queued, onRetrySend, onDiscardSend } = props;
  return (
    <>
      {queued.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title={m.history.inProgress} detail={`${queued.length}`} />
          {queued.map((entry) => (
            <QueuedRow key={entry.id} entry={entry} onRetry={onRetrySend} onDiscard={onDiscardSend} />
          ))}
        </View>
      )}
      <SavedClasses {...props} hideEmpty={queued.length > 0} />
    </>
  );
}

function SavedClasses({
  items,
  status,
  onRetry,
  onOpen,
  onDelete,
  onTryExample,
  hideEmpty,
}: HistoryListProps & { hideEmpty: boolean }) {
  const m = useT();
  if (status === "loading" && items.length === 0) return <LoadingHistory />;
  if (status === "error" && items.length === 0) return <HistoryError onRetry={onRetry} />;
  if (items.length === 0) return hideEmpty ? null : <EmptyHistory onTryExample={onTryExample} />;

  return (
    <View style={styles.section}>
      <SectionHeader title={m.history.yourClasses} detail={`${items.length}`} />
      {items.map((item) => (
        <ClassRow key={item.id} item={item} onOpen={onOpen} onDelete={onDelete} />
      ))}
      <Txt variant="small" style={styles.tip}>
        {m.history.holdToDelete}
      </Txt>
    </View>
  );
}

function ClassRow({ item, onOpen, onDelete }: { item: SavedClass } & Pick<HistoryListProps, "onOpen" | "onDelete">) {
  const theme = useTheme();
  const m = useT();
  const { pack } = item;
  const color = theme.avatars[pickIndex(pack.subject, theme.avatars.length)];
  const highPriority = pack.focus.filter((f) => f.priority === "high").length;

  function confirmDelete() {
    confirmDestructive({
      title: m.history.deleteTitle,
      message: m.history.deleteMessage(pack.title),
      confirmLabel: m.common.delete,
      onConfirm: () => {
        onDelete(item.id).catch((err: unknown) =>
          showMessage(m.history.couldNotDelete, err instanceof Error ? err.message : m.common.tryAgain),
        );
      },
    });
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${pack.title}, ${pack.subject}, ${relativeDay(item.date, m)}`}
      accessibilityHint={m.history.openHint}
      onPress={() => onOpen(item.id)}
      onLongPress={confirmDelete}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.card, borderColor: theme.line, boxShadow: theme.shadow, opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <View style={[styles.avatar, { backgroundColor: color }]}>
        <Text style={styles.avatarText}>{(pack.subject.trim()[0] ?? "?").toUpperCase()}</Text>
      </View>
      <View style={styles.grow}>
        <Txt variant="bodyStrong" numberOfLines={2}>
          {pack.title}
        </Txt>
        <Txt variant="small" numberOfLines={1}>
          {pack.subject} · {relativeDay(item.date, m)}
          {highPriority > 0 ? ` · ${m.history.keyTopics(highPriority)}` : ""}
        </Txt>
      </View>
      <Ionicons name={forwardChevron()} size={20} color={theme.faint} />
    </Pressable>
  );
}

/** A recording on its way to becoming notes, or one that could not be turned into notes. */
function QueuedRow({
  entry,
  onRetry,
  onDiscard,
}: {
  entry: QueueEntry;
  onRetry: (id: string) => void;
  onDiscard: (id: string) => void;
}) {
  const theme = useTheme();
  const m = useT();
  const router = useRouter();
  const failed = entry.state === "failed";
  const q = m.history.queue;
  const when = q.recorded(relativeDay(entry.createdAt, m), formatClock(entry.durationSeconds));
  const headline = entry.limitReached ? q.limitReached : q[entry.state];
  const detail = failed
    ? (entry.error ?? m.common.somethingWrong)
    : entry.state === "processing"
      ? q.processingDetail
      : q.sendingDetail;

  function confirmDiscard() {
    confirmDestructive({
      title: q.deleteTitle,
      message: q.deleteMessage,
      confirmLabel: m.common.delete,
      onConfirm: () => onDiscard(entry.id),
    });
  }

  return (
    <View
      style={[
        styles.row,
        styles.queued,
        { backgroundColor: failed ? theme.highSoft : theme.card, borderColor: failed ? theme.high : theme.line },
      ]}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.queuedTop}>
        <View style={[styles.avatar, { backgroundColor: failed ? theme.card : theme.primarySoft }]}>
          {failed ? (
            <Ionicons name="alert-circle" size={24} color={theme.high} />
          ) : (
            <ActivityIndicator color={theme.primary} />
          )}
        </View>
        <View style={styles.grow}>
          <Txt variant="bodyStrong" color={failed ? theme.high : undefined}>
            {headline}
          </Txt>
          <Txt variant="small">{when}</Txt>
        </View>
      </View>
      <Txt variant="small" style={styles.queuedDetail}>
        {detail}
      </Txt>
      {failed && entry.limitReached && (
        <Txt variant="small" style={styles.queuedDetail}>
          {q.keptOnPhone}
        </Txt>
      )}
      {failed && (
        <View style={styles.queuedActions}>
          {entry.limitReached ? (
            <>
              <Button kind="primary" icon="diamond-outline" label={m.plans.seePlans} onPress={() => router.push("/plans")} style={styles.grow} />
              <Button icon="refresh" label={m.common.retry} onPress={() => onRetry(entry.id)} />
            </>
          ) : (
            <Button kind="primary" icon="refresh" label={m.common.retry} onPress={() => onRetry(entry.id)} style={styles.grow} />
          )}
          <Button icon="trash-outline" label={m.common.delete} onPress={confirmDiscard} />
        </View>
      )}
    </View>
  );
}

function LoadingHistory() {
  const theme = useTheme();
  const m = useT();
  return (
    <View style={styles.section} accessibilityLabel={m.history.loading} accessibilityRole="progressbar">
      <SectionHeader title={m.history.yourClasses} />
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.row, { backgroundColor: theme.card, borderColor: theme.line, opacity: 1 - i * 0.25 }]}>
          <View style={[styles.avatar, { backgroundColor: theme.cardAlt }]} />
          <View style={[styles.grow, styles.skeletonLines]}>
            <View style={[styles.skeleton, { backgroundColor: theme.cardAlt, width: "75%" }]} />
            <View style={[styles.skeleton, { backgroundColor: theme.cardAlt, width: "45%" }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

function HistoryError({ onRetry }: { onRetry: () => void }) {
  const theme = useTheme();
  const m = useT();
  return (
    <View style={[styles.empty, { borderColor: theme.line }]} accessibilityRole="alert">
      <IconBubble name="cloud-offline-outline" color={theme.medium} background={theme.mediumSoft} size={56} />
      <Txt variant="heading" style={styles.center}>
        {m.history.loadErrorTitle}
      </Txt>
      <Txt variant="small" style={styles.center}>
        {m.history.loadErrorText}
      </Txt>
      <Button kind="ghost" icon="refresh" label={m.common.tryAgain} onPress={onRetry} />
    </View>
  );
}

function EmptyHistory({ onTryExample }: { onTryExample: () => void }) {
  const theme = useTheme();
  const m = useT();
  return (
    <View style={[styles.empty, { borderColor: theme.line }]}>
      <IconBubble name="sparkles" color={theme.primary} background={theme.primarySoft} size={56} />
      <Txt variant="heading" style={styles.center}>
        {m.history.emptyTitle}
      </Txt>
      <Txt variant="small" style={styles.center}>
        {m.history.emptyText}
      </Txt>
      <Button kind="ghost" icon="play-circle-outline" label={m.history.tryExample} onPress={onTryExample} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.xxl },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  avatar: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#FFFFFF", fontFamily: fonts.extrabold, fontSize: 19 },
  grow: { flex: 1 },
  tip: { textAlign: "center", marginTop: spacing.xs },
  empty: {
    marginTop: spacing.xxl,
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.xl,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: radius.lg,
  },
  center: { textAlign: "center" },
  queued: { flexDirection: "column", alignItems: "stretch" },
  queuedTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  queuedDetail: { marginTop: spacing.sm },
  queuedActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  skeletonLines: { gap: spacing.sm },
  skeleton: { height: 12, borderRadius: 6 },
});
