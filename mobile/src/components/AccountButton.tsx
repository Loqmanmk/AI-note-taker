import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePlan } from "@/hooks/usePlan";
import { useAuth } from "@/lib/auth";
import { confirmDestructive, showMessage } from "@/lib/confirm";
import { openPrivacyPolicy } from "@/lib/links";
import { fonts, radius, spacing, useTheme } from "@/lib/theme";
import { useT } from "@/i18n";
import { AppLanguagePicker } from "./AppLanguagePicker";
import { PlanUsage } from "./PlanUsage";
import { Button, Txt } from "./ui";

/** The student's initial in a circle; opens a panel with their account and sign-out. */
export function AccountButton() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const m = useT();
  const { enabled, session, signOut, deleteAccount } = useAuth();
  const plan = usePlan();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  if (!enabled || !session) return null;

  const metadata = session.user.user_metadata as { full_name?: unknown; name?: unknown };
  const name = String(metadata.full_name ?? metadata.name ?? "");
  const email = session.user.email ?? "";
  const initial = (name || email || "?").trim()[0]?.toUpperCase() ?? "?";

  function confirmSignOut() {
    confirmDestructive({
      title: m.account.signOutTitle,
      message: m.account.signOutMessage,
      confirmLabel: m.account.signOut,
      onConfirm: () => {
        setOpen(false);
        signOut();
      },
    });
  }

  function confirmDeleteAccount() {
    confirmDestructive({
      title: m.account.deleteTitle,
      message: m.account.deleteMessage,
      confirmLabel: m.account.deleteAccount,
      onConfirm: async () => {
        setDeleting(true);
        try {
          await deleteAccount();
          setOpen(false);
        } catch (err) {
          showMessage(m.account.notDeleted, err instanceof Error ? err.message : m.common.tryAgain);
        } finally {
          setDeleting(false);
        }
      },
    });
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={m.account.label(name || email)}
        hitSlop={8}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.avatar, { backgroundColor: theme.primarySoft, opacity: pressed ? 0.7 : 1 }]}
      >
        <Text style={[styles.initial, { color: theme.primary }]}>{initial}</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel={m.common.close} />
        <View style={[styles.sheet, { backgroundColor: theme.card, paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={[styles.handle, { backgroundColor: theme.line }]} />
          <View style={styles.who}>
            <View style={[styles.bigAvatar, { backgroundColor: theme.primarySoft }]}>
              <Text style={[styles.bigInitial, { color: theme.primary }]}>{initial}</Text>
            </View>
            <View style={styles.grow}>
              {name !== "" && <Txt variant="heading">{name}</Txt>}
              <Txt variant="small" numberOfLines={1}>
                {email}
              </Txt>
            </View>
          </View>
          {plan.status && (
            <PlanUsage
              status={plan.status}
              onPress={() => {
                setOpen(false);
                router.push("/plans");
              }}
            />
          )}
          <Txt variant="small" style={styles.note}>
            {m.account.savedNote}
          </Txt>
          <AppLanguagePicker />
          <Button icon="log-out-outline" label={m.account.signOut} onPress={confirmSignOut} />
          <View style={styles.links}>
            <Button kind="ghost" icon="shield-checkmark-outline" label={m.account.privacy} onPress={openPrivacyPolicy} />
            <Button
              kind="ghost"
              icon="trash-outline"
              label={m.account.deleteAccount}
              loading={deleting}
              onPress={confirmDeleteAccount}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  initial: { fontFamily: fonts.extrabold, fontSize: 16 },
  backdrop: { flex: 1, backgroundColor: "rgba(10, 8, 20, 0.45)" },
  sheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingHorizontal: spacing.xl, gap: spacing.lg },
  handle: { width: 40, height: 5, borderRadius: 3, alignSelf: "center", marginTop: spacing.md },
  who: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  bigAvatar: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  bigInitial: { fontFamily: fonts.extrabold, fontSize: 22 },
  grow: { flex: 1 },
  note: { marginTop: -spacing.xs },
  links: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: -spacing.sm },
});
