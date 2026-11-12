import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useTheme } from "@/lib/theme";

export default function RootLayout() {
  const theme = useTheme();
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.bg },
          headerTintColor: theme.ink,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
        <Stack.Screen name="index" options={{ title: "FocusNotes" }} />
        <Stack.Screen name="class/[id]" options={{ title: "Your notes" }} />
      </Stack>
    </SafeAreaProvider>
  );
}
