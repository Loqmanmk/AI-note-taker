import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatRelativeDay, pickIndex } from "@shared/format";
import type { SavedClass } from "@shared/schema";
import type { ClassListStatus } from "@/lib/classStore";
import { confirmDestructive, showMessage } from "@/lib/confirm";
import { fonts, radius, spacing, useTheme } from "@/lib/theme";
import { Button, IconBubble, SectionHeader, Txt } from "./ui";

type HistoryListProps = {
  items: SavedClass[];
  status: ClassListStatus;
  onRetry: () => void;
  onOpen: (id: string) => void;
  /** Rejects with an Error safe to show when the class could not be deleted. */
  onDelete: (id: string) => Promise<void>;
  onTryExample: () => void;
};

export function HistoryList({ items, status, onRetry, onOpen, onDelete, onTryExample }: HistoryListProps) {
  if (status === "loading" && items.length === 0) return <LoadingHistory />;
  if (status === "error" && items.length === 0) return <HistoryError onRetry={onRetry} />;
  if (items.length === 0) return <EmptyHistory onTryExample={onTryExample} />;

  return (
    <View style={styles.section}>
      <SectionHeader title="Your classes" detail={`${items.length}`} />
      {items.map((item) => (
        <ClassRow key={item.id} item={item} onOpen={onOpen} onDelete={onDelete} />
      ))}
      <Txt variant="small" style={styles.tip}>
        Press and hold a class to delete it.
      </Txt>
    </View>
  );
}

function ClassRow({ item, onOpen, onDelete }: { item: SavedClass } & Pick<HistoryListProps, "onOpen" | "onDelete">) {
  const theme = useTheme();
  const { pack } = item;
  const color = theme.avatars[pickIndex(pack.subject, theme.avatars.length)];
  const highPriority = pack.focus.filter((f) => f.priority === "high").length;

  function confirmDelete() {
    confirmDestructive({
      title: "Delete this class?",
      message: `“${pack.title}” will be deleted.`,
      confirmLabel: "Delete",
      onConfirm: () => {
        onDelete(item.id).catch((err: unknown) =>
          showMessage("Could not delete", err instanceof Error ? err.message : "Try again."),
        );
      },
    });
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${pack.title}, ${pack.subject}, ${formatRelativeDay(item.date)}`}
      accessibilityHint="Opens the notes. Press and hold to delete."
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
          {pack.subject} · {formatRelativeDay(item.date)}
          {highPriority > 0 ? ` · ${highPriority} key topic${highPriority > 1 ? "s" : ""}` : ""}
        </Txt>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.faint} />
    </Pressable>
  );
}

function LoadingHistory() {
  const theme = useTheme();
  return (
    <View style={styles.section} accessibilityLabel="Loading your classes" accessibilityRole="progressbar">
      <SectionHeader title="Your classes" />
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
  return (
    <View style={[styles.empty, { borderColor: theme.line }]} accessibilityRole="alert">
      <IconBubble name="cloud-offline-outline" color={theme.medium} background={theme.mediumSoft} size={56} />
      <Txt variant="heading" style={styles.center}>
        Could not load your classes
      </Txt>
      <Txt variant="small" style={styles.center}>
        Check your internet connection. Your classes are safe in your account.
      </Txt>
      <Button kind="ghost" icon="refresh" label="Try again" onPress={onRetry} />
    </View>
  );
}

function EmptyHistory({ onTryExample }: { onTryExample: () => void }) {
  const theme = useTheme();
  return (
    <View style={[styles.empty, { borderColor: theme.line }]}>
      <IconBubble name="sparkles" color={theme.primary} background={theme.primarySoft} size={56} />
      <Txt variant="heading" style={styles.center}>
        Your classes will appear here
      </Txt>
      <Txt variant="small" style={styles.center}>
        Record your first class, or see what FocusNotes makes from an example biology lesson.
      </Txt>
      <Button kind="ghost" icon="play-circle-outline" label="Try an example class" onPress={onTryExample} />
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
  skeletonLines: { gap: spacing.sm },
  skeleton: { height: 12, borderRadius: 6 },
});
