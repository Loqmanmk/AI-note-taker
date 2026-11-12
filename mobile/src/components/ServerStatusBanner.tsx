import { StyleSheet, View } from "react-native";
import type { ServerStatus } from "@/hooks/useServerStatus";
import { getApiBaseUrl } from "@/lib/api";
import { radius, spacing, useTheme } from "@/lib/theme";
import { Button, IconBubble, Txt } from "./ui";

type ServerStatusBannerProps = {
  status: ServerStatus;
  onRetry: () => void;
};

/** Says nothing when all is well; explains what to check when the server cannot be reached. */
export function ServerStatusBanner({ status, onRetry }: ServerStatusBannerProps) {
  const theme = useTheme();
  if (status !== "unreachable") return null;

  const address = getApiBaseUrl();
  return (
    <View style={[styles.banner, { backgroundColor: theme.mediumSoft }]} accessibilityRole="alert">
      <View style={styles.top}>
        <IconBubble name="cloud-offline-outline" color={theme.medium} background={theme.card} size={36} />
        <Txt variant="bodyStrong" color={theme.medium} style={styles.grow}>
          The app cannot reach the server
        </Txt>
      </View>
      <Txt variant="small">
        {address
          ? `It is looking for it at ${address}. Check that “npm run dev” is running on the computer, then open that address in this phone's browser to test the connection.`
          : "No server address is set. Add EXPO_PUBLIC_API_URL to mobile/.env on the computer and restart Expo."}
      </Txt>
      <Button kind="ghost" icon="refresh" label="Check again" onPress={onRetry} style={styles.retry} />
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg, gap: spacing.sm },
  top: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  grow: { flex: 1 },
  retry: { alignSelf: "flex-start" },
});
