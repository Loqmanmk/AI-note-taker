# Setting up Google sign-in

FocusNotes uses [Supabase](https://supabase.com) for accounts: it handles the Google sign-in and stores each student's classes. You do these steps once. They take about 20 minutes and both services are free to start.

Until they are done, the app runs **without** sign-in in development, and keeps classes on each device.

## 1. Create the Supabase project

1. Sign up at [supabase.com](https://supabase.com) and create a new project. Pick a region close to your users and keep the database password somewhere safe.
2. Open **Project Settings → API** (or **Connect**) and note two values:
   - the **Project URL**, like `https://abcdefgh.supabase.co`
   - the **publishable key**, which starts with `sb_publishable_`

   The publishable key is meant to be public. Never use the **secret** key in the app.

## 2. Create the table for saved classes

1. In Supabase, open **SQL Editor → New query**.
2. Paste the whole content of [`supabase/migrations/20261112000000_create_classes.sql`](../supabase/migrations/20261112000000_create_classes.sql) and click **Run**.

This creates the `classes` table and the rules that let each student see only their own classes.

Do the same with [`supabase/migrations/20261113000000_create_recordings_bucket.sql`](../supabase/migrations/20261113000000_create_recordings_bucket.sql). It creates the private `recordings` storage, where the app uploads each recording before its notes are written.

## 3. Create the Google credentials

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and create a project (for example "FocusNotes").
2. Open **Google Auth Platform**:
   - **Branding**: app name "FocusNotes", your email as support email.
   - **Audience**: choose **External**. While the app is in **Testing**, only the Google accounts you add under **Test users** can sign in, so add your own Gmail address there.
   - **Data Access**: make sure `openid`, `.../auth/userinfo.email` and `.../auth/userinfo.profile` are listed. Add `openid` by hand if it is missing.
3. Open **Clients → Create client**:
   - Application type: **Web application**.
   - **Authorized JavaScript origins**: `http://localhost:3000`.
   - **Authorized redirect URIs**: your Supabase callback URL, `https://<your-project>.supabase.co/auth/v1/callback`. Supabase shows the exact address on its Google provider page (next step).
   - Click **Create** and copy the **Client ID** and **Client secret**.

## 4. Turn on Google in Supabase

1. In Supabase, open **Authentication → Sign In / Providers → Google**.
2. Turn it on, paste the Client ID and Client secret, and save.
3. Open **Authentication → URL Configuration**:
   - **Site URL**: `http://localhost:3000`
   - **Redirect URLs**, add these three:
     - `http://localhost:3000/**` (the website)
     - `exp://**` (the app in Expo Go)
     - `focusnotes://**` (the installed app, later)

## 5. Give the keys to the app

In the project folder, add to `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Create `mobile/.env` (copy `mobile/.env.example`) with the same two values:

```
EXPO_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Both files are ignored by git, so the keys are not pushed to GitHub.

Restart both programs. For the mobile app, clear Expo's cache once so it picks up the new values:

```bash
npm run dev
```

```bash
cd mobile
npm start -- --clear
```

## Signing in from Expo Go

Supabase refuses return addresses that contain an IP address (only `127.0.0.1` is allowed), and Expo Go normally reaches your computer by its IP, such as `exp://192.168.1.20:8081`. In that case Google sign-in sends the phone to `localhost:3000` instead of back to the app.

`npm start` in `mobile/` avoids this: it gives your computer a name through [sslip.io](https://sslip.io), such as `192-168-1-20.sslip.io`, which points to the same address. The return address becomes `exp://192-168-1-20.sslip.io:8081/--/`, which `exp://**` allows. Always start Expo with `npm start`, not `npx expo start`.

If your network cannot resolve that name, `npm start` says so and uses the IP: the app works but Google sign-in cannot come back to it. Try another network, or `npm start -- --tunnel` (the notes server then needs `EXPO_PUBLIC_API_URL` in `mobile/.env`). An installed build of the app uses `focusnotes://` and is not affected.

## Checking it works

- The app and the website open on a **Continue with Google** screen.
- After signing in, your initial appears at the top right of the app.
- A class created on the phone also appears on the website when signed in with the same account.
- In Supabase, **Table Editor → classes** shows one row per saved class.

## If sign-in fails

| What you see | What to check |
|---|---|
| Google says "Access blocked" or "not a test user" | Add your Gmail address under **Audience → Test users** in Google Cloud. |
| Google says "redirect_uri_mismatch" | The redirect URI in Google Cloud must be exactly your Supabase callback URL. |
| The phone lands on `localhost:3000` ("site inaccessible") after choosing your account | Supabase refused the return address. Start Expo with `npm start` in `mobile/` (see "Signing in from Expo Go"), and check `exp://**` is in **Redirect URLs**. |
| You come back to the app but stay on the sign-in screen | Send the lines starting with `[auth]` from the Expo terminal: they show each step. |
| "Sign in to create notes" on every request | `NEXT_PUBLIC_SUPABASE_*` in `.env.local` must be the same project as `EXPO_PUBLIC_SUPABASE_*` in `mobile/.env`. Restart `npm run dev`. |

## For developers: local Supabase

`npx supabase@latest start` runs Supabase locally with Docker, and `supabase/config.toml` already allows the app's redirect links. The integration tests use it:

```bash
SUPABASE_TEST_URL=http://127.0.0.1:54321 \
SUPABASE_TEST_PUBLISHABLE_KEY=<publishable key printed by supabase start> \
SUPABASE_TEST_SECRET_KEY=<secret key printed by supabase start> \
npx vitest run tests/integration
```

Never point these tests at the real project: they create and delete users.
