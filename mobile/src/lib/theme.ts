import { useColorScheme } from "react-native";

const light = {
  bg: "#f7f6f2",
  card: "#ffffff",
  ink: "#1c1b18",
  muted: "#6d6a62",
  line: "#e4e1d8",
  accent: "#2f5bea",
  accentInk: "#ffffff",
  high: "#c8371f",
  medium: "#b57a00",
  low: "#5d7a6a",
  good: "#1f7a4a",
  lost: "#7a3fd1",
};

const dark: Theme = {
  bg: "#141412",
  card: "#1e1e1b",
  ink: "#f1efe8",
  muted: "#a09c91",
  line: "#33322d",
  accent: "#7d9bff",
  accentInk: "#0d1330",
  high: "#ff8a73",
  medium: "#f0b84a",
  low: "#8fb3a0",
  good: "#5fd39a",
  lost: "#b995ff",
};

export type Theme = typeof light;

/** Colours for the current light or dark mode. Same palette as the web app. */
export function useTheme(): Theme {
  return useColorScheme() === "dark" ? dark : light;
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const radius = { sm: 8, md: 12, lg: 14 } as const;
