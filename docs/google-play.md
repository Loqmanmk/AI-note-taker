# Google Play: what to fill in

Before publishing, Google Play asks for links and declarations about your app. This page gives the answers that match what FocusNotes does. Check them against the app before you submit: you are responsible for what you declare.

## 1. Fill in your details first

Open [`lib/legal.ts`](../lib/legal.ts) and replace the three placeholders:

- `owner`: your name, or your company's
- `contactEmail`: an address where students can reach you about their data
- `country`: your country (Morocco: law 09-08)

Push the change: the privacy policy and account deletion pages update on your website.

## 2. Links Google Play asks for

| Play Console field | Value |
|---|---|
| Privacy policy | `https://<your address>/privacy` |
| Delete account URL (Data safety → Data deletion) | `https://<your address>/delete-account` |

Your address is the short one under **Domains** in Vercel, for example `ai-note-taker-rho.vercel.app`.

## 3. Data safety form

**Does your app collect or share any of the required user data types?** Yes.

**Is all of the user data collected by your app encrypted in transit?** Yes (all traffic uses HTTPS).

**Do you provide a way for users to request that their data is deleted?** Yes: in the app (Account → Delete my account) and at the delete account URL.

**Data types collected:**

| Category → type | Collected | Shared | Optional? | Purpose |
|---|---|---|---|---|
| Personal info → Name | Yes | No | Required | Account management |
| Personal info → Email address | Yes | No | Required | Account management |
| Audio → Voice or sound recordings | Yes | No | Required to create notes | App functionality |
| App activity → Other user-generated content (the notes) | Yes | No | Required to create notes | App functionality |

"Shared" means given to a third party for its own use. Data processed by service providers on your behalf (Supabase, Google's Gemini API, Vercel) is not "shared" under Google Play's definitions, but read Google's current definitions in the form before answering.

Do **not** mark audio as "processed ephemerally": recordings are stored briefly (on the phone and in your storage) before and while notes are written.

If you later add crash reporting or analytics, update this form.

## 4. Other declarations

- **App access**: sign-in uses Google only. Before review, publish your Google sign-in in Google Cloud (Google Auth Platform → Audience → **Publish app**), otherwise reviewers are blocked by the "Testing" mode. Then write: "Sign in with any Google account."
- **Target audience**: students; not designed for children under 13.
- **Ads**: no.
- **Content rating**: complete the questionnaire (education app, no user-to-user communication).
- **Permissions**: the microphone (to record classes) and notifications (to tell students their notes are ready).

## 5. Testing before production

New personal developer accounts must run a **closed test** with a minimum number of testers for a minimum number of days before they can publish to everyone (currently 12 testers for 14 days; check the Play Console, as this changes). Plan for it: it fits the beta test with real students.

For the store, build an Android App Bundle with the production profile:

```bash
npx eas-cli@latest build --platform android --profile production
```
