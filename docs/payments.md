# Payments on the website (Paddle)

Students pay for Premium or Pro on the website's **Plans** page (`/pricing`). Paddle sells the subscription as the merchant of record: it takes the card, charges taxes in every country, handles refunds, and pays you. The app on Google Play never links to this page (Google Play forbids sending students to outside payments for digital features); students who subscribed on the website simply get their plan in the app.

## How it works

1. A signed-in student picks a plan on `/pricing`. Paddle's payment window opens with their account id attached.
2. After payment, Paddle calls `/api/payments/paddle` (a "notification"). The server checks Paddle's signature, then saves the plan and its end date in `subscriptions` with the Supabase secret key. Renewals, plan changes and cancellations arrive the same way.
3. The plan lasts until the end of the paid period plus 2 days, so a renewal has time to arrive. A canceled subscription keeps the plan until the end of the period; Paddle then sends the cancellation and the plan ends.
4. "Manage my subscription" opens Paddle's page to cancel, switch plan or change the card.

Code: `lib/paymentsConfig.ts`, `lib/server/payments/`, `app/api/payments/`, `app/pricing/page.tsx`.

## Settings (Vercel → Settings → Environment Variables)

| Name | Type | Where to find it |
|---|---|---|
| `NEXT_PUBLIC_PADDLE_ENV` | Config | `sandbox` while testing, `production` when live |
| `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` | Config | Paddle → Developer tools → Authentication → Client-side tokens |
| `NEXT_PUBLIC_PADDLE_PRICE_PREMIUM_MONTHLY` | Config | Paddle → Catalog → Products → Premium → monthly price id (`pri_…`) |
| `NEXT_PUBLIC_PADDLE_PRICE_PREMIUM_YEARLY` | Config | same, yearly price |
| `NEXT_PUBLIC_PADDLE_PRICE_PRO_MONTHLY` | Config | Pro, monthly price |
| `NEXT_PUBLIC_PADDLE_PRICE_PRO_YEARLY` | Config | Pro, yearly price |
| `PADDLE_API_KEY` | **Secret** | Paddle → Developer tools → Authentication → API keys |
| `PADDLE_WEBHOOK_SECRET` | **Secret** | Paddle → Developer tools → Notifications → your destination → secret key |
| `SUPABASE_SECRET_KEY` | **Secret** | Supabase → Project settings → API keys → Secret key |

Until all of them are set, the page shows "Coming soon" and the notification address answers 503.

The notification destination in Paddle: URL `https://<your site>/api/payments/paddle`, events `subscription.created`, `subscription.updated`, `subscription.canceled`, `subscription.activated`, `subscription.past_due`, `subscription.paused`, `subscription.resumed`.

## Testing with fake cards

In the sandbox, pay with card `4242 4242 4242 4242`, any future date, any CVC. Check the plan in Supabase → Table Editor → `subscriptions`, and in the app.
