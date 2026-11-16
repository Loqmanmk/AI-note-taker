import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { PLANS, effectivePlan, startOfMonth, type PlanId } from "../../plans";
import { PAYING_STATUSES } from "../payments/subscriptionChange";
import { estimateAiCost, type UsageRow } from "./costs";

const DAY = 24 * 60 * 60 * 1000;
const MAX_USER_PAGES = 20; // 20 × 1000 users; enough for the early stage, then move counts to SQL.

export async function allUsers(client: SupabaseClient): Promise<User[]> {
  const users: User[] = [];
  for (let page = 1; page <= MAX_USER_PAGES; page++) {
    const { data, error } = await client.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw new Error(`Could not list users: ${error.message}`);
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }
  return users;
}

type Query = ReturnType<ReturnType<SupabaseClient["from"]>["select"]>;

async function count(
  client: SupabaseClient,
  table: string,
  build: (q: Query) => Query,
) {
  const { count: n, error } = await build(
    client.from(table).select("id", { count: "exact", head: true }),
  );
  if (error) throw new Error(`Could not count ${table}: ${error.message}`);
  return n ?? 0;
}

type SubscriptionRow = {
  user_id: string;
  plan: string;
  expires_at: string | null;
  provider: string | null;
  status: string | null;
};

export async function overview(client: SupabaseClient, now = new Date()) {
  const iso = (ms: number) => new Date(now.getTime() - ms).toISOString();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  ).toISOString();
  const month = startOfMonth(now).toISOString();

  const [
    users,
    classesToday,
    classes7,
    classes30,
    failed7,
    processing,
    usage,
    subs,
  ] = await Promise.all([
    allUsers(client),
    count(client, "classes", (q) => q.gte("created_at", today)),
    count(client, "classes", (q) => q.gte("created_at", iso(7 * DAY))),
    count(client, "classes", (q) => q.gte("created_at", iso(30 * DAY))),
    count(client, "classes", (q) =>
      q.eq("status", "failed").gte("created_at", iso(7 * DAY)),
    ),
    count(client, "classes", (q) =>
      q.eq("status", "processing").gte("created_at", iso(15 * 60 * 1000)),
    ),
    client
      .from("class_usage")
      .select("user_id, recording_seconds, ai_path")
      .gte("created_at", month)
      .limit(100_000),
    client
      .from("subscriptions")
      .select("user_id, plan, expires_at, provider, status"),
  ]);
  if (usage.error)
    throw new Error(`Could not read usage: ${usage.error.message}`);
  if (subs.error)
    throw new Error(`Could not read subscriptions: ${subs.error.message}`);

  const usageRows = (usage.data ?? []) as (UsageRow & { user_id: string })[];
  const subRows = (subs.data ?? []) as SubscriptionRow[];
  const planOf = new Map(
    subRows.map((s) => [s.user_id, effectivePlan(s, now)]),
  );
  const plans: Record<PlanId, number> = { free: 0, premium: 0, pro: 0 };
  for (const user of users) plans[planOf.get(user.id) ?? "free"]++;

  const paid = subRows.filter(
    (s) =>
      s.provider === "paddle" &&
      s.status !== null &&
      PAYING_STATUSES.has(s.status) &&
      effectivePlan(s, now) !== "free",
  );
  const paidByPlan = {
    premium: paid.filter((s) => s.plan === "premium").length,
    pro: paid.filter((s) => s.plan === "pro").length,
  };
  const monthlyRevenue =
    paidByPlan.premium * (PLANS.premium.price?.usdMonthly ?? 0) +
    paidByPlan.pro * (PLANS.pro.price?.usdMonthly ?? 0);

  const byPath = { transcript: 0, audio: 0, text: 0 };
  for (const row of usageRows) {
    const path =
      row.ai_path === "transcript" || row.ai_path === "text"
        ? row.ai_path
        : "audio";
    byPath[path]++;
  }

  return {
    users: {
      total: users.length,
      new7: users.filter((u) => u.created_at >= iso(7 * DAY)).length,
      new30: users.filter((u) => u.created_at >= iso(30 * DAY)).length,
      active7: users.filter((u) => (u.last_sign_in_at ?? "") >= iso(7 * DAY))
        .length,
    },
    classes: {
      today: classesToday,
      last7: classes7,
      last30: classes30,
      failed7,
      processing,
    },
    month: {
      classes: usageRows.length,
      hours:
        Math.round(
          (usageRows.reduce((s, r) => s + r.recording_seconds, 0) / 3600) * 10,
        ) / 10,
      byPath,
      aiCostUsd: estimateAiCost(usageRows),
    },
    plans,
    paid: {
      ...paidByPlan,
      monthlyRevenueUsd: Math.round(monthlyRevenue * 100) / 100,
    },
  };
}

export async function recentFailures(client: SupabaseClient, users: User[]) {
  const { data, error } = await client
    .from("classes")
    .select("id, user_id, created_at, error")
    .eq("status", "failed")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(`Could not read failures: ${error.message}`);
  const email = new Map(users.map((u) => [u.id, u.email ?? ""]));
  return (data ?? []).map((row) => ({
    ...row,
    email: email.get(row.user_id) ?? "",
  }));
}

export async function recentAudit(client: SupabaseClient) {
  const { data } = await client
    .from("admin_audit")
    .select("created_at, admin_email, action, target, details")
    .order("created_at", { ascending: false })
    .limit(20);
  return data ?? [];
}

/** Users matching a search, with their plan and this month's usage. */
export async function userList(
  client: SupabaseClient,
  search: string,
  now = new Date(),
) {
  const users = await allUsers(client);
  const q = search.trim().toLowerCase();
  const matches = users
    .filter((u) => !q || (u.email ?? "").toLowerCase().includes(q))
    .sort((a, b) => (b.created_at > a.created_at ? 1 : -1))
    .slice(0, 50);
  const ids = matches.map((u) => u.id);
  if (ids.length === 0) return [];
  const [subs, usage] = await Promise.all([
    client
      .from("subscriptions")
      .select("user_id, plan, expires_at, provider, status")
      .in("user_id", ids),
    client
      .from("class_usage")
      .select("user_id, recording_seconds")
      .in("user_id", ids)
      .gte("created_at", startOfMonth(now).toISOString()),
  ]);
  const sub = new Map(
    ((subs.data ?? []) as SubscriptionRow[]).map((s) => [s.user_id, s]),
  );
  return matches.map((u) => {
    const s = sub.get(u.id) ?? null;
    const rows = (usage.data ?? []).filter((r) => r.user_id === u.id);
    return {
      id: u.id,
      email: u.email ?? "",
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at ?? null,
      plan: effectivePlan(s, now),
      provider: s?.provider ?? null,
      status: s?.status ?? null,
      expiresAt: s?.expires_at ?? null,
      classesThisMonth: rows.length,
      hoursThisMonth:
        Math.round(
          (rows.reduce((n, r) => n + r.recording_seconds, 0) / 3600) * 10,
        ) / 10,
    };
  });
}
