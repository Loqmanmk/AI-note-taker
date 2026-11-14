import { Alert, Platform } from "react-native";

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  /** Destructive actions show their button in red on iPhone. */
  destructive?: boolean;
};

/**
 * Asks before a destructive action.
 * React Native's Alert does nothing in a browser, so the web preview uses the browser's own dialog.
 */
export function confirmDestructive({
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  destructive = true,
}: ConfirmOptions) {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: cancelLabel, style: "cancel" },
    { text: confirmLabel, style: destructive ? "destructive" : "default", onPress: onConfirm },
  ]);
}

/** Shows a short message with an OK button. */
export function showMessage(title: string, message: string) {
  if (Platform.OS === "web") window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}

/** Asks before an ordinary action, such as opening the plans. */
export function confirmAction(options: Omit<ConfirmOptions, "destructive">) {
  confirmDestructive({ ...options, destructive: false });
}
