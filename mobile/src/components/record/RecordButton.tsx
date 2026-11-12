import { useEffect, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/lib/theme";

const SIZE = 92;

type RecordButtonProps = {
  recording: boolean;
  disabled?: boolean;
  onPress: () => void;
};

/** The big round button. Shows a microphone to start, a square to stop, and pulses while recording. */
export function RecordButton({ recording, disabled, onPress }: RecordButtonProps) {
  const theme = useTheme();
  // Created once and kept for the life of the button.
  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!recording) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [recording, pulse]);

  const ring = {
    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.55] }) }],
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
  };
  const colors = recording ? ([theme.recording, theme.recording] as const) : theme.gradient;

  return (
    <View style={styles.wrap}>
      {recording && <Animated.View style={[styles.ring, { backgroundColor: theme.recording }, ring]} />}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={recording ? "Stop recording" : "Start recording"}
        accessibilityState={{ disabled: Boolean(disabled) }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.94 : 1 }], opacity: disabled ? 0.45 : 1 }]}
      >
        <LinearGradient colors={[colors[0], colors[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.button}>
          {recording ? <View style={styles.stop} /> : <Ionicons name="mic" size={40} color="#FFFFFF" />}
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: SIZE * 1.6, height: SIZE * 1.6, alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", width: SIZE, height: SIZE, borderRadius: SIZE / 2 },
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0px 10px 24px rgba(91, 79, 233, 0.35)",
  },
  stop: { width: 30, height: 30, borderRadius: 7, backgroundColor: "#FFFFFF" },
});
