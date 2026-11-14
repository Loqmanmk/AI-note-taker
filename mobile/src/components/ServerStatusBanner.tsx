import { StyleSheet, View } from "react-native";
import type { ServerStatus } from "@/hooks/useServerStatus";
import { getApiBaseUrl } from "@/lib/api";
import { useT } from "@/i18n";
import { radius, spacing, useTheme } from "@/lib/theme";
import { Button, IconBubble, Txt } from "./ui";

type ServerStatusBannerProps = {
  status: ServerStatus;
  onRetry: () => void;
};

/** Says nothing when all is well; explains what to check when the server cannot be reached. */
export function ServerStatusBanner({ status, onRetry }: ServerStatusBannerProps) {
  const theme = useTheme();
  const m = useT();
  if (status !== "unreachable") return null;

  const address = getApiBaseUrl();
  return (
    <View style={[styles.banner, { backgroundColor: theme.mediumSoft }]} accessibilityRole="alert">
      <View style={styles.top}>
        <IconBubble name="cloud-offline-outline" color={theme.medium} background={theme.card} size={36} />
        <Txt variant="bodyStrong" color={theme.medium} style={styles.grow}>
          {m.server.unreachable}
        </Txt>
      </View>
      <Txt variant="small">
        {address ? m.server.lookingAt(address) : m.server.noAddress}
      </Txt>
      <Button kind="ghost" icon="refresh" label={m.server.checkAgain} onPress={onRetry} style={styles.retry} />
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg, gap: spacing.sm },
  top: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  grow: { flex: 1 },
  retry: { alignSelf: "flex-start" },
});
