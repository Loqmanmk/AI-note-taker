import { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NOTE_LANGUAGES, type NoteLanguage } from "@shared/constants";
import { useT } from "@/i18n";
import { radius, spacing, useTheme } from "@/lib/theme";
import { Txt } from "./ui";

const CODES = Object.keys(NOTE_LANGUAGES) as NoteLanguage[];

type LanguagePickerProps = { value: NoteLanguage; onChange: (language: NoteLanguage) => void };

/** A compact row showing the notes language, opening a bottom sheet to change it. */
export function LanguagePicker({ value, onChange }: LanguagePickerProps) {
  const theme = useTheme();
  const m = useT();
  const names = m.noteLanguage.options;
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={m.noteLanguage.change(names[value])}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: theme.card, borderColor: theme.line, opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <Ionicons name="language" size={20} color={theme.primary} />
        <View style={styles.grow}>
          <Txt variant="small">{m.noteLanguage.label}</Txt>
          <Txt variant="bodyStrong">{names[value]}</Txt>
        </View>
        <Ionicons name="chevron-down" size={20} color={theme.muted} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel={m.common.close} />
        <View style={[styles.sheet, { backgroundColor: theme.card, paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={[styles.handle, { backgroundColor: theme.line }]} />
          <Txt variant="heading" style={styles.sheetTitle}>
            {m.noteLanguage.sheetTitle}
          </Txt>
          {CODES.map((code) => {
            const label = names[code];
            const selected = code === value;
            return (
              <Pressable
                key={code}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => {
                  onChange(code);
                  setOpen(false);
                }}
                style={({ pressed }) => [
                  styles.option,
                  { backgroundColor: selected ? theme.primarySoft : pressed ? theme.cardAlt : "transparent" },
                ]}
              >
                <Txt variant={selected ? "bodyStrong" : "body"} color={selected ? theme.primary : undefined}>
                  {label}
                </Txt>
                {selected && <Ionicons name="checkmark" size={22} color={theme.primary} />}
              </Pressable>
            );
          })}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  grow: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: "rgba(10, 8, 20, 0.45)" },
  sheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingHorizontal: spacing.lg },
  handle: { width: 40, height: 5, borderRadius: 3, alignSelf: "center", marginVertical: spacing.md },
  sheetTitle: { marginBottom: spacing.sm, paddingHorizontal: spacing.sm },
  option: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
});
