import type { ComponentProps, ReactNode } from "react";
import {
  ActivityIndicator,
  I18nManager,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fonts, radius, spacing, useTheme } from "@/lib/theme";

export type IconName = ComponentProps<typeof Ionicons>["name"];

/** Arrows that point "forward" follow the reading direction: right, or left in Arabic. */
export function forwardChevron(): IconName {
  return I18nManager.isRTL ? "chevron-back" : "chevron-forward";
}

export function forwardArrow(): IconName {
  return I18nManager.isRTL ? "arrow-back" : "arrow-forward";
}

/* ---------- Text ---------- */

const textVariants = StyleSheet.create({
  display: { fontFamily: fonts.extrabold, fontSize: 30, lineHeight: 36, letterSpacing: -0.6 },
  title: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 30, letterSpacing: -0.4 },
  heading: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 23 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 24 },
  label: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20 },
  small: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, letterSpacing: 0.8, textTransform: "uppercase" },
});

type TxtProps = TextProps & {
  variant?: keyof typeof textVariants;
  tone?: "ink" | "muted" | "faint";
  color?: string;
};

/** Text in the app's font, sizes and colours. */
export function Txt({ variant = "body", tone, color, style, ...rest }: TxtProps) {
  const theme = useTheme();
  const defaultTone = variant === "small" || variant === "caption" ? "muted" : "ink";
  return <Text {...rest} style={[textVariants[variant], { color: color ?? theme[tone ?? defaultTone] }, style]} />;
}

/* ---------- Surfaces ---------- */

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.line, boxShadow: theme.shadow }, style]}>
      {children}
    </View>
  );
}

/** A small rounded label, such as a priority or a count. */
export function Badge({ label, icon, color, background }: { label: string; icon?: IconName; color: string; background: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: background }]}>
      {icon && <Ionicons name={icon} size={13} color={color} />}
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

/** An icon on a soft circular background. */
export function IconBubble({ name, color, background, size = 40 }: { name: IconName; color: string; background: string; size?: number }) {
  return (
    <View style={[styles.bubble, { width: size, height: size, borderRadius: size / 2, backgroundColor: background }]}>
      <Ionicons name={name} size={size * 0.5} color={color} />
    </View>
  );
}

export function ProgressBar({ value, color }: { value: number; color?: string }) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <View
      style={[styles.track, { backgroundColor: theme.line }]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    >
      <View style={[styles.fill, { width: `${clamped * 100}%`, backgroundColor: color ?? theme.primary }]} />
    </View>
  );
}

/* ---------- Buttons ---------- */

type ButtonProps = {
  label: string;
  onPress: () => void;
  kind?: "primary" | "secondary" | "ghost";
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, kind = "secondary", icon, disabled, loading, style }: ButtonProps) {
  const theme = useTheme();
  const palette = {
    primary: { bg: theme.primary, border: theme.primary, text: theme.primaryInk },
    secondary: { bg: theme.card, border: theme.line, text: theme.ink },
    ghost: { bg: "transparent", border: "transparent", text: theme.primary },
  }[kind];
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(inactive), busy: Boolean(loading) }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        kind === "ghost" && styles.ghost,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity: disabled ? 0.45 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        icon && <Ionicons name={icon} size={19} color={palette.text} />
      )}
      <Text style={[styles.buttonText, { color: palette.text }]}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({ icon, label, onPress, color }: { icon: IconName; label: string; onPress: () => void; color?: string }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.5 : 1 }]}
    >
      <Ionicons name={icon} size={22} color={color ?? theme.ink} />
    </Pressable>
  );
}

/** A section title with an optional detail on the right. */
export function SectionHeader({ title, detail }: { title: string; detail?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Txt variant="heading">{title}</Txt>
      {detail ? <Txt variant="small">{detail}</Txt> : null}
    </View>
  );
}

export const textStyles: Record<string, TextStyle> = textVariants;

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeText: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.3 },
  bubble: { alignItems: "center", justifyContent: "center" },
  track: { height: 6, borderRadius: 3, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 3 },
  button: {
    minHeight: 52,
    flexDirection: "row",
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  ghost: { minHeight: 44, paddingHorizontal: spacing.sm },
  buttonText: { fontFamily: fonts.bold, fontSize: 16 },
  iconButton: { padding: spacing.sm },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
});
