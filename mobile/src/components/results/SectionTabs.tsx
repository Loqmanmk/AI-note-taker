import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import type { IconName } from "@/components/ui";
import { fonts, radius, spacing, useTheme } from "@/lib/theme";

export type SectionTab<T extends string> = { id: T; label: string; icon: IconName; badge?: string };

type SectionTabsProps<T extends string> = {
  tabs: SectionTab<T>[];
  selected: T;
  onSelect: (id: T) => void;
};

/** Icon tabs that scroll sideways. Sits in a sticky header, so it needs its own background. */
export function SectionTabs<T extends string>({ tabs, selected, onSelect }: SectionTabsProps<T>) {
  const theme = useTheme();

  return (
    <View style={{ backgroundColor: theme.bg }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityRole="tablist"
        contentContainerStyle={styles.row}
      >
        {tabs.map((tab) => {
          const active = tab.id === selected;
          const color = active ? theme.primaryInk : theme.muted;
          return (
            <Pressable
              key={tab.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={tab.badge ? `${tab.label}, ${tab.badge}` : tab.label}
              onPress={() => {
                if (!active) Haptics.selectionAsync().catch(() => {});
                onSelect(tab.id);
              }}
              style={[
                styles.tab,
                active
                  ? { backgroundColor: theme.primary, borderColor: theme.primary }
                  : { backgroundColor: theme.card, borderColor: theme.line },
              ]}
            >
              <Ionicons name={tab.icon} size={17} color={color} />
              <Text style={[styles.label, { color }]}>{tab.label}</Text>
              {tab.badge && (
                <View style={[styles.badge, { backgroundColor: active ? "rgba(255,255,255,0.25)" : theme.cardAlt }]}>
                  <Text style={[styles.badgeText, { color }]}>{tab.badge}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingVertical: spacing.md },
  tab: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  label: { fontFamily: fonts.bold, fontSize: 14 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 1 },
  badgeText: { fontFamily: fonts.bold, fontSize: 12 },
});
