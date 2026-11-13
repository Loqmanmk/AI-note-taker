import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconBubble, Txt, type IconName } from "@/components/ui";
import { getAuthReturnAddress, useAuth } from "@/lib/auth";
import { fonts, radius, spacing, useTheme } from "@/lib/theme";

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  { icon: "mic", title: "Record your class", text: "Your phone listens while you focus on the teacher." },
  { icon: "flame", title: "Know what matters", text: "See what the teacher stressed most, ranked for the exam." },
  { icon: "help-buoy", title: "Never stay lost", text: "Tap when you stop following. That part gets re-explained." },
];

export default function SignInScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function signIn() {
    setBusy(true);
    setError("");
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView bounces={false} contentContainerStyle={styles.screen}>
      <LinearGradient
        colors={[theme.gradient[0], theme.gradient[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + spacing.xxl }]}
      >
        <View style={styles.logo}>
          <Ionicons name="sparkles" size={30} color="#FFFFFF" />
        </View>
        <Text style={styles.brand}>FocusNotes</Text>
        <Text style={styles.headline} accessibilityRole="header">
          Your classes, turned into exam-ready notes.
        </Text>
      </LinearGradient>

      <View style={[styles.sheet, { backgroundColor: theme.bg, paddingBottom: insets.bottom + spacing.xl }]}>
        {FEATURES.map((feature) => (
          <View key={feature.title} style={styles.feature}>
            <IconBubble name={feature.icon} color={theme.primary} background={theme.primarySoft} size={44} />
            <View style={styles.grow}>
              <Txt variant="bodyStrong">{feature.title}</Txt>
              <Txt variant="small">{feature.text}</Txt>
            </View>
          </View>
        ))}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue with Google"
          accessibilityState={{ busy, disabled: busy }}
          disabled={busy}
          onPress={signIn}
          style={({ pressed }) => [
            styles.google,
            { backgroundColor: theme.card, borderColor: theme.line, boxShadow: theme.shadow, opacity: pressed ? 0.75 : 1 },
          ]}
        >
          {busy ? <ActivityIndicator color={theme.ink} /> : <Ionicons name="logo-google" size={20} color={theme.ink} />}
          <Text style={[styles.googleText, { color: theme.ink }]}>{busy ? "Opening Google…" : "Continue with Google"}</Text>
        </Pressable>

        {error !== "" && (
          <View style={[styles.error, { backgroundColor: theme.highSoft }]} accessibilityRole="alert">
            <Txt variant="small" color={theme.high}>
              {error}
            </Txt>
          </View>
        )}

        <Txt variant="small" style={styles.privacy}>
          We use your Google name and email only to keep your classes in your account.
        </Txt>

        {__DEV__ && <ReturnAddressHint />}
      </View>
    </ScrollView>
  );
}

/** Development only: shows where sign-in returns to, and warns about addresses Supabase refuses. */
function ReturnAddressHint() {
  const theme = useTheme();
  const address = getAuthReturnAddress();
  // Supabase refuses return addresses with a raw IP address, except 127.0.0.1.
  const usesIp = /^[a-z]+:\/\/(\d{1,3}\.){3}\d{1,3}/i.test(address) && !address.includes("//127.0.0.1");

  return (
    <Txt variant="small" tone={usesIp ? undefined : "faint"} color={usesIp ? theme.high : undefined} style={styles.privacy} selectable>
      {usesIp
        ? `Development: Google sign-in cannot return to ${address} because Supabase refuses IP addresses. Start Expo with "npm start" (not "npx expo start").`
        : `Development: Supabase must allow the return address ${address}`}
    </Txt>
  );
}

const white = "#FFFFFF";

const styles = StyleSheet.create({
  screen: { flexGrow: 1 },
  hero: { paddingHorizontal: spacing.xl, paddingBottom: 56 },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  brand: { color: white, fontFamily: fonts.bold, fontSize: 16, marginTop: spacing.lg },
  headline: { color: white, fontFamily: fonts.extrabold, fontSize: 32, lineHeight: 39, letterSpacing: -0.6, marginTop: spacing.sm },
  sheet: {
    flex: 1,
    marginTop: -28,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    gap: spacing.lg,
  },
  feature: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  grow: { flex: 1 },
  google: {
    minHeight: 56,
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  googleText: { fontFamily: fonts.bold, fontSize: 16 },
  error: { borderRadius: radius.md, padding: spacing.md },
  privacy: { textAlign: "center" },
});
