# Admin console

`/admin` on the website. Only accounts whose email is in `ADMIN_EMAILS` can open it; everyone else gets "not an admin". Each request checks the Google sign-in token with Supabase, then reads the account's email from Supabase (never from the browser).

## What it shows and does

- **Services**: live checks of Supabase, Gemini, Groq Whisper and Paddle with the server's own keys. Only "working / problem / off" is shown, never a key.
- **Controls**:
  - *Pause new notes (maintenance)*: students get a clear message in their language; recordings stay on their phone and can be sent again later.
  - *Speech-to-text on/off*: off makes Gemini listen to every recording (useful if Groq has an outage).
  Both apply within about 20 seconds, without a deploy.
- **Numbers**: users (total, new, active), classes (today, week, month, failed, in progress), hours recorded this month, estimated AI cost (prices in `lib/server/admin/costs.ts`), students per plan, paying subscriptions and an estimated monthly revenue.
- **Users**: search by email; plan, classes and hours this month, last sign-in; give a plan (for a number of days or without end), put back on Free, reset the month's classes. Plans paid on Paddle cannot be changed here (use the Paddle dashboard).
- **Recent failures** with the message students saw. Technical details: Vercel → Logs (`[notes]`), Sentry for app crashes.
- **Server settings**: which environment variables are set (yes/no only).
- **Admin history**: every admin action, who and when.

## Setup

1. Run `supabase/migrations/20261116000000_admin.sql` in the Supabase SQL editor.
2. Vercel → Settings → Environments → Production → add `ADMIN_EMAILS` (type **Secret**), value: your Gmail, or several separated by commas.
3. `SUPABASE_SECRET_KEY` must be set (it already is for payments).
4. Redeploy, open `https://<your site>/admin` and sign in with that Gmail.

The console reads all users on each load, which is fine for the first few thousand users; past that, move the counts into SQL views.
