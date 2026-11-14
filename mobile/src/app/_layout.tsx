import { useEffect, useState, useSyncExternalStore } from "react";
import { router, Stack } from "expo-router";
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
import { CrashScreen } from "@/components/CrashScreen";
import { languageStore } from "@/i18n";
import { ensureLayoutDirection } from "@/i18n/direction";
import { AuthProvider, useAuth } from "@/lib/auth";
import { onNotesNotificationOpened } from "@/lib/notifications";
import { fonts, useTheme } from "@/lib/theme";
import { welcomeStore } from "@/lib/welcome";

// Keep the splash screen up until fonts and the saved session are ready, so nothing jumps.
SplashScreen.preventAutoHideAsync().catch(() => {});

/** Expo Router shows this when a screen throws while drawing. */
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  useEffect(() => {
    console.error("[app] a screen failed", error);
  }, [error]);
  return <CrashScreen onRetry={() => retry()} />;
}

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
  const languageReady = useLanguageReady();
  const welcomeSeen = useSyncExternalStore(welcomeStore.subscribe, welcomeStore.getSnapshot, welcomeStore.getSnapshot);
  // If the fonts fail to load, carry on with the system font rather than blocking the app.
  const ready = (fontsLoaded || Boolean(fontError)) && !auth.isLoading && languageReady && welcomeSeen !== null;
  // Without accounts set up, the app is open; otherwise a session is required.
  const signedIn = !auth.enabled || auth.session !== null;
  // Students already signed in skip the welcome, for example after updating the app.
  const showWelcome = !signedIn && welcomeSeen === false;

  useEffect(() => {
    welcomeStore.load();
  }, []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // Tapping a "notes ready" notification opens that class.
  useEffect(() => {
    if (!ready || !signedIn) return;
    return onNotesNotificationOpened((id) => router.push({ pathname: "/class/[id]", params: { id } }));
  }, [ready, signedIn]);

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
          <Stack.Screen name="plans" options={{ title: "" }} />
        </Stack.Protected>
        <Stack.Protected guard={showWelcome}>
          <Stack.Screen name="welcome" options={{ headerShown: false, title: "FocusNotes" }} />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn && !showWelcome}>
          <Stack.Screen name="sign-in" options={{ headerShown: false, title: "FocusNotes" }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}

/**
 * Loads the student's language and lays the app out in its direction (right to left for Arabic).
 * Stays false while the app restarts to change direction, so the splash screen covers it.
 */
function useLanguageReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    languageStore
      .load()
      .then(ensureLayoutDirection)
      .then((restarting) => {
        if (active && !restarting) setReady(true);
      })
      .catch(() => active && setReady(true));
    return () => {
      active = false;
    };
  }, []);
  return ready;
}
