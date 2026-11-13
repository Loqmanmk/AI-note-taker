# Putting FocusNotes online and installing the app

Two parts, done once:

1. **The server on Vercel**, so the phone works on any Wi-Fi or mobile data, without your computer.
2. **The Android app**, built by Expo and installed on your phone, without Expo Go.

Do [accounts-setup.md](accounts-setup.md) first: Google sign-in must already work.

## How recordings travel

Vercel refuses requests larger than 4.5 MB, and an hour of class is about 15 MB. So the app uploads each recording to the student's private folder in Supabase Storage, sends the server only its location, and the server deletes the recording once the notes are written. Vercel's free plan also stops a request after 300 seconds; the server stops trying AI models in time to answer before that.

## 1. Create the storage for recordings (Supabase)

1. In Supabase, open **SQL Editor → New query**.
2. Paste the whole content of [`supabase/migrations/20261113000000_create_recordings_bucket.sql`](../supabase/migrations/20261113000000_create_recordings_bucket.sql) and click **Run**.
3. Open **Storage**: a bucket named `recordings` should appear, not public.

## 2. Put the server on Vercel

1. Go to [vercel.com](https://vercel.com) and sign up with your GitHub account.
2. Click **Add New → Project** and import the `AI-note-taker` repository.
3. Keep the detected settings (framework **Next.js**, root directory `./`).
4. Open **Environment Variables** and add these three, with the same values as in your `.env.local`:

   | Name | Value |
   |---|---|
   | `GEMINI_API_KEY` | your Gemini key |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://<your-project>.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` |

5. Click **Deploy** and wait for it to finish (2 to 3 minutes).
6. Note your address, for example `https://ai-note-taker-abc.vercel.app`, and open `https://<your address>/api/health`. It should show `{"ok":true}`.

   Use the short address shown under **Domains**. Each deployment also has a long address with random letters and your account name (like `ai-note-taker-r6za9nk7i-yourname-projects.vercel.app`): Vercel protects those, so only you, signed in to Vercel, can open them, and the app would be refused.

From now on, every `git push` to GitHub updates the website automatically.

## 3. Allow the online website to sign in

1. In Supabase, **Authentication → URL Configuration → Redirect URLs**: add `https://<your address>/**`.
2. Optional: set **Site URL** to `https://<your address>` so that is the default.
3. In Google Cloud, **Clients → your web client → Authorized JavaScript origins**: add `https://<your address>`.

Open your address in a browser and sign in with Google to check it.

## 4. Build the Android app

On your computer, in the `mobile` folder:

1. Create a free account at [expo.dev](https://expo.dev).
2. Sign in from the terminal:

   ```bash
   npx eas-cli@latest login
   ```

3. Link the project to your Expo account. This adds a project id to `app.json`:

   ```bash
   npx eas-cli@latest init
   ```

   Save that change to GitHub, so it is not lost and does not block `git pull` later:

   ```bash
   git add app.json
   git commit -m "Link the Expo project"
   git push
   ```

4. Give the build its three settings (they are public values, not secrets). Replace the values with yours:

   ```bash
   npx eas-cli@latest env:set --environment preview --visibility plaintext --name EXPO_PUBLIC_API_URL --value https://<your address>
   ```

   ```bash
   npx eas-cli@latest env:set --environment preview --visibility plaintext --name EXPO_PUBLIC_SUPABASE_URL --value https://<your-project>.supabase.co
   ```

   ```bash
   npx eas-cli@latest env:set --environment preview --visibility plaintext --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value sb_publishable_...
   ```

   If your version of the tool does not know `env:set`, use `env:create` with the same options.

5. Start the build. It runs on Expo's computers; on the free plan it can wait in a queue, then takes about 10 to 20 minutes:

   ```bash
   npx eas-cli@latest build --platform android --profile preview
   ```

   Answer **yes** if it offers to create an Android signing key.

6. When it finishes, the terminal shows a link and a QR code. Open it on your phone, download the APK and install it. Android will ask you to allow installing apps from your browser: allow it for this install.

## 5. Use it

Open **FocusNotes** on your phone (its own icon, not Expo Go), tap **Continue with Google**, record a class, and create your notes. Your computer can be off.

The installed app returns from Google through `focusnotes://`, which is already in your Supabase **Redirect URLs**.

## Updating the app later

- **Server changes:** `git push`, and Vercel redeploys by itself.
- **App changes:** run the build command of step 4.5 again and install the new APK over the old one.

## Good to know

- **Free plans:** Vercel (Hobby), Supabase, Gemini's free tier and Expo's free builds are enough to test with a few students. Gemini's free tier has daily limits, and Google may use what is sent on that tier to improve its products.
- **Request limit:** each account can create 10 sets of notes per 10 minutes. On Vercel this counter is kept per server instance, so it is approximate; a shared store (such as Redis) would make it exact.
- **Recordings** are deleted from storage after use, and from Google right after the notes are written.
