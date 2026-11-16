import { StyleSheet, View } from "react-native";

/**
 * The FocusNotes mark: three sound bars turning into three lines of notes, the first one
 * highlighted. Drawn with views so it stays sharp at any size; meant for a violet background.
 */
export function Logo({ size = 24 }: { size?: number }) {
  // Proportions follow the app icon, drawn in a 320 × 200 box.
  const u = size / 320;
  const bar = (height: number) => ({ width: 34 * u, height: height * u, borderRadius: 17 * u, backgroundColor: WHITE });
  const line = (width: number, color: string, opacity = 1) => ({
    width: width * u,
    height: 36 * u,
    borderRadius: 18 * u,
    backgroundColor: color,
    opacity,
  });

  return (
    // The mark reads left to right (sound, then notes) in every language.
    <View style={[styles.row, { width: size, height: 200 * u, gap: 44 * u }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.row, { gap: 20 * u }]}>
        <View style={bar(80)} />
        <View style={bar(200)} />
        <View style={bar(120)} />
      </View>
      <View style={{ gap: 32 * u }}>
        <View style={line(134, HIGHLIGHT)} />
        <View style={line(134, WHITE)} />
        <View style={line(86, WHITE, 0.75)} />
      </View>
    </View>
  );
}

const WHITE = "#FFFFFF";
const HIGHLIGHT = "#FF9D5C";

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", direction: "ltr" },
});
