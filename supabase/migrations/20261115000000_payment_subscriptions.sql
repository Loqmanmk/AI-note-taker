-- Links a student's plan to the subscription that pays for it (Paddle for now). Only the server's
-- payment webhook writes these columns, with the service role; students can still only read their row.

alter table public.subscriptions
  add column provider text check (provider in ('paddle', 'manual')),
  add column provider_customer_id text check (char_length(provider_customer_id) <= 200),
  add column provider_subscription_id text check (char_length(provider_subscription_id) <= 200),
  -- The payment service's own status: active, trialing, past_due, paused, canceled...
  add column status text check (char_length(status) <= 40),
  -- When the payment service last changed the subscription; older notifications are ignored.
  add column provider_updated_at timestamptz;

create unique index subscriptions_provider_subscription_idx
  on public.subscriptions (provider, provider_subscription_id)
  where provider_subscription_id is not null;
