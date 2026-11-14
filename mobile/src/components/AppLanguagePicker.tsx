import { Pressable, StyleSheet, Text, View } from "react-native";
import { APP_LANGUAGES, languageStore, useLanguage, useT, type AppLanguage } from "@/i18n";
import { ensureLayoutDirection } from "@/i18n/direction";
import { fonts, radius, spacing, useTheme } from "@/lib/theme";
import { Txt } from "./ui";

/** Chooses the language of the app's screens: the phone's, English, French or Arabic. */
export function AppLanguagePicker() {
  const theme = useTheme();
  const m = useT();
  const language = useLanguage();
  const choice = languageStore.getChoice();
  const options: { code: AppLanguage | null; name: string }[] = [{ code: null, name: m.appLanguage.system }, ...APP_LANGUAGES];

  async function choose(code: AppLanguage | null) {
    const next = await languageStore.choose(code);
    // Arabic reads right to left: the app restarts once to turn its layout around.
    await ensureLayoutDirection(next);
  }

  return (
    <View style={styles.wrap}>
      <Txt variant="label">{m.appLanguage.title}</Txt>
      <View style={styles.row} accessibilityRole="radiogroup">
        {options.map((option) => {
          const selected = option.code === choice;
          return (
            <Pressable
              key={option.code ?? "system"}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLanguage={option.code ?? language}
              onPress={() => choose(option.code)}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: selected ? theme.primary : theme.cardAlt,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <Text style={[styles.chipText, { color: selected ? theme.primaryInk : theme.ink }]}>{option.name}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { minHeight: 40, paddingHorizontal: spacing.md, borderRadius: radius.pill, justifyContent: "center" },
  chipText: { fontFamily: fonts.semibold, fontSize: 14 },
});
