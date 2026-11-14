# Error tracking (Sentry)

The Android app sends a report to Sentry when it crashes or a screen fails: the error, the phone model, Android and app version, and the anonymous account id. Never names, emails, recordings or notes (`mobile/src/lib/errorTracking.ts`). Reports are off while developing and until a DSN is set.

## Turn it on

1. Create a free account at sentry.io and a **React Native** project named `focusnotes`.
2. Copy the project's **DSN** (Project settings → Client Keys (DSN)). It is not a secret.
3. Give it to the app builds, from the `mobile` folder:

   ```bash
   npx eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_SENTRY_DSN --value "<DSN>" --visibility plaintext
   ```

   Do the same with `--environment production` before building for the store.
4. Build a new APK: Sentry adds phone code, so an over-the-air update is not enough.

## Readable error locations (later)

Builds do not upload source maps yet (`SENTRY_DISABLE_AUTO_UPLOAD` in `eas.json`), so reports show the error message and screen, but code locations are minified. To make them readable, create a Sentry auth token, save it as a secret EAS variable `SENTRY_AUTH_TOKEN` with `SENTRY_ORG` and `SENTRY_PROJECT`, and remove `SENTRY_DISABLE_AUTO_UPLOAD`.
