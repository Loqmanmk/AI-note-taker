import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextProps, type ViewStyle } from "react-native";
import { radius, spacing, useTheme } from "@/lib/theme";

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.line }, style]}>{children}</View>
  );
}

type TxtProps = TextProps & { variant?: "body" | "title" | "heading" | "muted" | "small" };

/** Text in the app's colours and sizes. */
export function Txt({ variant = "body", style, ...rest }: TxtProps) {
  const theme = useTheme();
  const color = variant === "muted" || variant === "small" ? theme.muted : theme.ink;
  return <Text {...rest} style={[styles[variant], { color }, style]} />;
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  kind?: "primary" | "secondary" | "link";
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, kind = "secondary", disabled, style }: ButtonProps) {
  const theme = useTheme();
  const palette = {
    primary: { bg: theme.accent, border: theme.accent, text: theme.accentInk },
    secondary: { bg: theme.card, border: theme.line, text: theme.ink },
    link: { bg: "transparent", border: "transparent", text: theme.accent },
  }[kind];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        kind === "link" ? styles.link : styles.button,
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: disabled ? 0.45 : pressed ? 0.7 : 1 },
        style,
      ]}
    >
      <Text style={[styles.buttonText, { color: palette.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  body: { fontSize: 16, lineHeight: 23 },
  title: { fontSize: 28, lineHeight: 33, fontWeight: "700", letterSpacing: -0.5 },
  heading: { fontSize: 16, lineHeight: 22, fontWeight: "700", marginBottom: spacing.xs },
  muted: { fontSize: 16, lineHeight: 23 },
  small: { fontSize: 13, lineHeight: 18 },
  button: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  link: { minHeight: 44, justifyContent: "center" },
  buttonText: { fontSize: 16, fontWeight: "600" },
});
