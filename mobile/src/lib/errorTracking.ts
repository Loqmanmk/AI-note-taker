import type { ComponentType } from "react";
import { Platform } from "react-native";
import * as Sentry from "@sentry/react-native";

// Expo replaces this with its value at build time. The DSN only lets the app send error reports;
// it is not a secret.
const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? "";

/** Reports go out only from installed apps with a DSN, never while developing. */
const enabled = DSN !== "" && !__DEV__ && Platform.OS !== "web";

/** Removes anything after "?" or "#" in a link, where tokens and codes travel. */
function withoutQuery(url: string): string {
  return url.split(/[?#]/)[0] ?? url;
}

/**
 * Starts error reporting (crashes and errors, with the phone model, Android version and app
 * version). It never sends names, emails, recordings or notes: only an anonymous account id.
 */
export function initErrorTracking() {
  if (!enabled) return;
  Sentry.init({
    dsn: DSN,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    maxBreadcrumbs: 50,
    beforeBreadcrumb(breadcrumb) {
      const url = breadcrumb.data?.url;
      if (typeof url === "string") breadcrumb.data = { ...breadcrumb.data, url: withoutQuery(url) };
      return breadcrumb;
    },
    beforeSend(event) {
      if (event.request?.url) event.request.url = withoutQuery(event.request.url);
      if (event.user) event.user = { id: event.user.id };
      return event;
    },
  });
}

/** Links reports to the account by its anonymous id, so several reports from one student can be grouped. */
export function setErrorTrackingUser(userId: string | null) {
  if (enabled) Sentry.setUser(userId ? { id: userId } : null);
}

export function reportError(error: unknown) {
  if (enabled) Sentry.captureException(error);
}

/** Wraps the root component so crashes while drawing are reported. */
export function withErrorTracking(Root: ComponentType): ComponentType {
  return enabled ? Sentry.wrap(Root) : Root;
}
