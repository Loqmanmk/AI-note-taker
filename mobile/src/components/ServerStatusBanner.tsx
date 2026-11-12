import { StyleSheet, View } from "react-native";
import type { ServerStatus } from "@/hooks/useServerStatus";
import { getApiBaseUrl } from "@/lib/api";
import { radius, spacing, useTheme } from "@/lib/theme";
import { Button, Txt } from "./ui";

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
    <View style={[styles.banner, { backgroundColor: theme.medium + "1f" }]} accessibilityRole="alert">
      <Txt style={[styles.title, { color: theme.medium }]}>The app cannot reach the server</Txt>
      <Txt variant="small">
        {address
          ? `It is looking for it at ${address}. Open that address in this phone's browser: if the page does not load, the problem is the network or the computer, not the app.`
          : "No server address is set. Add EXPO_PUBLIC_API_URL to mobile/.env on the computer and restart Expo."}
      </Txt>
      <Txt variant="small" style={styles.tips}>
        Check that “npm run dev” is running on the computer, and that the firewall on the computer allows Node.js on
        private networks.
      </Txt>
      <Button kind="link" label="Check again" onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg },
  title: { fontWeight: "700", marginBottom: spacing.xs },
  tips: { marginTop: spacing.sm },
});
