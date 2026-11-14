import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppLanguagePicker } from "@/components/AppLanguagePicker";
import { Button, Txt, forwardArrow, type IconName } from "@/components/ui";
import { useT } from "@/i18n";
import { fonts, radius, spacing, useTheme } from "@/lib/theme";
import { welcomeStore } from "@/lib/welcome";

const ICONS: IconName[] = ["mic", "help-buoy", "sparkles"];

/** Three short screens that explain the app, shown once before signing in. */
export default function WelcomeScreen() {
  const theme = useTheme();
  const m = useT();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const slides = m.welcome.slides;
  const slide = slides[index];
  const isLast = index === slides.length - 1;

  return (
    <ScrollView bounces={false} contentContainerStyle={[styles.screen, { backgroundColor: theme.bg }]}>
      <LinearGradient
        colors={[theme.gradient[0], theme.gradient[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + spacing.lg }]}
      >
        <View style={styles.topBar}>
          <Text style={styles.brand}>FocusNotes</Text>
          {!isLast && (
            <Pressable accessibilityRole="button" hitSlop={12} onPress={() => welcomeStore.markSeen()}>
              <Text style={styles.skip}>{m.welcome.skip}</Text>
            </Pressable>
          )}
        </View>
        <View style={styles.art} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={styles.ringOuter}>
            <View style={styles.ringInner}>
              <Ionicons name={ICONS[index]} size={56} color="#FFFFFF" />
            </View>
          </View>
        </View>
      </LinearGradient>

      <View style={[styles.sheet, { backgroundColor: theme.bg, paddingBottom: insets.bottom + spacing.xl }]}>
        <View style={styles.dots} accessibilityLabel={`${index + 1} / ${slides.length}`}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, { backgroundColor: i === index ? theme.primary : theme.line, width: i === index ? 24 : 8 }]}
            />
          ))}
        </View>

        <Txt variant="display" accessibilityRole="header">
          {slide.title}
        </Txt>
        <Txt tone="muted" style={styles.text}>
          {slide.text}
        </Txt>

        <View style={styles.grow} />

        {index === 0 && <AppLanguagePicker />}

        <Button
          kind="primary"
          icon={isLast ? "checkmark" : forwardArrow()}
          label={isLast ? m.welcome.start : m.welcome.next}
          onPress={() => (isLast ? welcomeStore.markSeen() : setIndex(index + 1))}
        />
      </View>
    </ScrollView>
  );
}

const white = "#FFFFFF";

const styles = StyleSheet.create({
  screen: { flexGrow: 1 },
  hero: { paddingHorizontal: spacing.xl, paddingBottom: 64 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44 },
  brand: { color: white, fontFamily: fonts.bold, fontSize: 16 },
  skip: { color: white, fontFamily: fonts.semibold, fontSize: 15, opacity: 0.9 },
  art: { alignItems: "center", paddingVertical: spacing.xxl },
  ringOuter: {
    width: 176,
    height: 176,
    borderRadius: 88,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  ringInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  sheet: {
    flex: 1,
    marginTop: -28,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    gap: spacing.lg,
  },
  dots: { flexDirection: "row", gap: 6 },
  dot: { height: 8, borderRadius: 4 },
  text: { marginTop: -spacing.sm },
  grow: { flexGrow: 1, minHeight: spacing.sm },
});
