import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { radius, spacing, useTheme } from "@/lib/theme";

type ChipsProps<T extends string> = {
  label: string;
  options: readonly (readonly [id: T, label: string])[];
  selected: T;
  onSelect: (id: T) => void;
};

/** A horizontally scrolling row where exactly one option is selected. Used for tabs and pickers. */
export function Chips<T extends string>({ label, options, selected, onSelect }: ChipsProps<T>) {
  const theme = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="tablist"
      accessibilityLabel={label}
      contentContainerStyle={styles.row}
    >
      {options.map(([id, text]) => {
        const active = id === selected;
        return (
          <Pressable
            key={id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(id)}
            style={[
              styles.chip,
              { borderColor: active ? theme.line : "transparent", backgroundColor: active ? theme.card : "transparent" },
            ]}
          >
            <Text style={[styles.text, { color: active ? theme.ink : theme.muted }]}>{text}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.xs, paddingVertical: spacing.xs },
  chip: { minHeight: 40, justifyContent: "center", paddingHorizontal: spacing.md, borderRadius: radius.sm, borderWidth: 1 },
  text: { fontSize: 15, fontWeight: "500" },
});
