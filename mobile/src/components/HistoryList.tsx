import { Alert, Pressable, StyleSheet, View } from "react-native";
import type { SavedClass } from "@shared/schema";
import { radius, spacing, useTheme } from "@/lib/theme";
import { Txt } from "./ui";

type HistoryListProps = {
  items: SavedClass[];
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
};

export function HistoryList({ items, onOpen, onDelete }: HistoryListProps) {
  const theme = useTheme();
  if (items.length === 0) return null;

  function confirmDelete(item: SavedClass) {
    Alert.alert("Delete this class?", `“${item.pack.title}” will be removed from this phone.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => onDelete(item.id) },
    ]);
  }

  return (
    <View style={styles.section}>
      <Txt variant="heading">Previous classes</Txt>
      {items.map((item) => (
        <Pressable
          key={item.id}
          accessibilityRole="button"
          accessibilityHint="Opens the notes. Press and hold to delete."
          onPress={() => onOpen(item.id)}
          onLongPress={() => confirmDelete(item)}
          style={({ pressed }) => [
            styles.row,
            { backgroundColor: theme.card, borderColor: theme.line, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Txt style={styles.title}>{item.pack.title}</Txt>
          <Txt variant="small">
            {item.pack.subject} · {new Date(item.date).toLocaleDateString()}
          </Txt>
        </Pressable>
      ))}
      <Txt variant="small">Press and hold a class to delete it.</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.xl },
  row: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  title: { fontWeight: "600" },
});
