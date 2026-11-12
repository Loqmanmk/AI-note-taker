import { useColorScheme } from "react-native";

const light = {
  bg: "#F6F5FB",
  card: "#FFFFFF",
  cardAlt: "#F0EFF8",
  ink: "#17152B",
  muted: "#6B6880",
  faint: "#9D9AB0",
  line: "#E7E5F0",

  primary: "#5B4FE9",
  primaryInk: "#FFFFFF",
  primarySoft: "#ECEAFD",
  /** Hero backgrounds. White text passes contrast on both stops. */
  gradient: ["#6D5DF6", "#8B4CF0"] as const,

  /** "I'm lost": orange stands apart from the brand colour. White text only in large bold type. */
  lost: "#E8590C",
  lostInk: "#B54708",
  lostSoft: "#FEEFE5",

  high: "#C62F35",
  highSoft: "#FDECEC",
  medium: "#9A5B00",
  mediumSoft: "#FDF3E1",
  low: "#0B7A6E",
  lowSoft: "#E2F6F3",
  good: "#147A48",
  goodSoft: "#E3F5EC",
  recording: "#E5484D",

  /** Colours for subject avatars. */
  avatars: ["#5B4FE9", "#C2418F", "#0B7A6E", "#B4610B", "#2F6FEB", "#7A4FD6"] as const,
  shadow: "0px 1px 2px rgba(23, 21, 43, 0.05), 0px 8px 24px rgba(23, 21, 43, 0.06)",
};

export type Theme = { [K in keyof typeof light]: (typeof light)[K] extends readonly string[] ? readonly string[] : string };

const dark: Theme = {
  bg: "#0F0E17",
  card: "#1A1926",
  cardAlt: "#232233",
  ink: "#F4F3FA",
  muted: "#A9A6BE",
  faint: "#77748C",
  line: "#2B2A3A",

  primary: "#8C82FF",
  primaryInk: "#0F0E17",
  primarySoft: "#2A2650",
  gradient: ["#5B4FE9", "#7B3FE0"],

  lost: "#E8590C",
  lostInk: "#FFA06A",
  lostSoft: "#3A2418",

  high: "#FF8589",
  highSoft: "#3A1C1F",
  medium: "#F5B341",
  mediumSoft: "#3A2C14",
  low: "#3CCFBC",
  lowSoft: "#11302C",
  good: "#4AD48E",
  goodSoft: "#123024",
  recording: "#FF6B6F",

  avatars: ["#7C72FF", "#E05AA8", "#2BB3A3", "#D98B2B", "#5A8CFF", "#9B7BF0"],
  shadow: "none",
};

/** Colours for the current light or dark mode. */
export function useTheme(): Theme {
  return useColorScheme() === "dark" ? dark : light;
}

export const fonts = {
  regular: "Manrope_400Regular",
  medium: "Manrope_500Medium",
  semibold: "Manrope_600SemiBold",
  bold: "Manrope_700Bold",
  extrabold: "Manrope_800ExtraBold",
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;
