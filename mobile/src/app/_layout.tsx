import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/manrope";
import { ClassSourceSync } from "@/components/ClassSourceSync";
import { AuthProvider, useAuth } from "@/lib/auth";
import { fonts, useTheme } from "@/lib/theme";

// Keep the splash screen up until fonts and the saved session are ready, so nothing jumps.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ClassSourceSync />
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const theme = useTheme();
  const auth = useAuth();
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  // If the fonts fail to load, carry on with the system font rather than blocking the app.
  const ready = (fontsLoaded || Boolean(fontError)) && !auth.isLoading;
  // Without accounts set up, the app is open; otherwise a session is required.
  const signedIn = !auth.enabled || auth.session !== null;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.bg },
          headerTintColor: theme.ink,
          headerTitleStyle: { fontFamily: fonts.bold },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: "minimal",
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="index" options={{ headerShown: false, title: "FocusNotes" }} />
          <Stack.Screen name="class/[id]" options={{ title: "" }} />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="sign-in" options={{ headerShown: false, title: "Sign in" }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}
