# Plans: Free, Premium and Pro

| Plan | Price | Classes a month | Longest recording |
|---|---|---|---|
| Free | 0 | 3 | 30 minutes |
| Premium | 49 MAD (≈ $4.99) a month, or 490 MAD a year | 30 | 2 hours |
| Pro | 89 MAD (≈ $8.99) a month, or 890 MAD a year | 100 (fair use) | 3 hours |

The numbers live in one place, `lib/plans.ts`, shared by the server and the app.

## How the limits work

- **The server decides.** Before writing notes, it reads the student's plan and counts this month's classes. Over a limit it answers `402` with `{ code: "plan_limit" }` and deletes the uploaded recording. The app keeps its own copy, shows **Plan limit reached** with **See plans**, and the student can send it again later.
- **A class counts once its notes are written.** A failed class does not count. Classes still being written count too, so sending several at once cannot go past the limit.
- **Deleting a class does not give it back**: the count is kept in `class_usage`, which students can add to but not change or delete.
- **Length** is estimated from the file size (the app records at about 4 KB per second), which the phone cannot fake, with 10% leeway. The app also stops the recording by itself at the plan's longest class, even with the phone locked.
- **Months** start on the 1st, in UTC.
- If the plan tables cannot be read (an outage), the class is allowed and the problem logged, so students are not blocked.

## Changing a student's plan (for testing)

Students can read their plan but never change it. In Supabase → **SQL Editor**, run (replace the email):

```sql
insert into public.subscriptions (user_id, plan)
select id, 'premium' from auth.users where email = 'student@example.com'
on conflict (user_id) do update set plan = excluded.plan, expires_at = null, updated_at = now();
```

Use `'pro'` for Pro, or `'free'` to go back. To start the month's count again for a test account:

```sql
delete from public.class_usage
where user_id = (select id from auth.users where email = 'student@example.com');
```

Switch to another app and back, or reopen the app, to see the new plan.

## Later: real payments

Payments will go through Google Play Billing (with RevenueCat). A purchase will write the student's row in `subscriptions` (plan and `expires_at`) from the server, with the service role. Nothing else needs to change: the limits already follow that row, and a lapsed subscription falls back to Free when `expires_at` passes.
