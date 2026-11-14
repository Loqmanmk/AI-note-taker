import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { t } from "@/i18n";

const CHANNEL_ID = "notes-ready";
const supported = Platform.OS !== "web";

// Show the "notes ready" alert even while the app is open.
if (supported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Asks once for permission to show notifications, the first time a student sends a class.
 * Returns whether notifications can be shown. Refusing never blocks the app.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!supported) return false;
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: t().notifications.channel,
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/** Tells the student their notes are ready. Tapping it opens the class (see NotificationRouter). */
export async function notifyNotesReady(classId: string, title: string): Promise<void> {
  if (!supported) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title: t().notifications.readyTitle, body: title, data: { classId } },
      trigger: Platform.OS === "android" ? { channelId: CHANNEL_ID } : null,
    });
  } catch {
    // A missing notification is not worth interrupting the student for.
  }
}

/** Tells the student their notes could not be written, so they can retry. */
export async function notifyNotesFailed(message: string): Promise<void> {
  if (!supported) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title: t().notifications.failedTitle, body: t().notifications.failedBody(message) },
      trigger: Platform.OS === "android" ? { channelId: CHANNEL_ID } : null,
    });
  } catch {
    // As above.
  }
}

/** Calls back with the class id when the student taps a "notes ready" notification. */
export function onNotesNotificationOpened(open: (classId: string) => void): () => void {
  if (!supported) return () => {};
  const read = (response: Notifications.NotificationResponse | null) => {
    const classId = response?.notification.request.content.data?.classId;
    if (typeof classId === "string") open(classId);
  };
  // The app may have been started by tapping the notification.
  read(Notifications.getLastNotificationResponse());
  const subscription = Notifications.addNotificationResponseReceivedListener(read);
  return () => subscription.remove();
}
