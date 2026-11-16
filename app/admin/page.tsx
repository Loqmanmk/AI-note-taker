"use client";

import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/hooks/useAuth";
import { getSupabase } from "@/lib/client/supabase";

type Check = {
  name: string;
  state: "ok" | "error" | "off";
  detail: string;
  ms?: number;
};
type Overview = {
  admin: string;
  stats: {
    users: { total: number; new7: number; new30: number; active7: number };
    classes: {
      today: number;
      last7: number;
      last30: number;
      failed7: number;
      processing: number;
    };
    month: {
      classes: number;
      hours: number;
      byPath: { transcript: number; audio: number; text: number };
      aiCostUsd: number;
    };
    plans: { free: number; premium: number; pro: number };
    paid: { premium: number; pro: number; monthlyRevenueUsd: number };
  };
  services: Check[];
  settings: { maintenance: boolean; transcription: boolean };
  failures: {
    id: string;
    email: string;
    created_at: string;
    error: string | null;
  }[];
  audit: {
    created_at: string;
    admin_email: string;
    action: string;
    target: string | null;
    details: Record<string, unknown> | null;
  }[];
  config: { name: string; set: boolean; secret: boolean }[];
};
type UserRow = {
  id: string;
  email: string;
  createdAt: string;
  lastSignInAt: string | null;
  plan: "free" | "premium" | "pro";
  provider: string | null;
  status: string | null;
  expiresAt: string | null;
  classesThisMonth: number;
  hoursThisMonth: number;
};

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const token = (await getSupabase()?.auth.getSession())?.data.session
    ?.access_token;
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token ?? ""}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
  return body;
}

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString() : "—";
const usd = (n: number) => `$${n.toFixed(2)}`;

/** The owner's console: health of the services, numbers, switches, users and failures. */
export default function AdminPage() {
  const auth = useAuth();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setError("");
    setBusy(true);
    try {
      setData(await call<Overview>("/api/admin/overview"));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load the dashboard.",
      );
    } finally {
      setBusy(false);
    }
  }, []);

  const searchUsers = useCallback(async (q: string) => {
    try {
      setUsers(
        (
          await call<{ users: UserRow[] }>(
            `/api/admin/users?q=${encodeURIComponent(q)}`,
          )
        ).users,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load users.");
    }
  }, []);

  useEffect(() => {
    if (!auth.session) return;
    let active = true;
    Promise.all([
      call<Overview>("/api/admin/overview"),
      call<{ users: UserRow[] }>("/api/admin/users?q="),
    ])
      .then(([overview, list]) => {
        if (!active) return;
        setData(overview);
        setUsers(list.users);
      })
      .catch(
        (err: unknown) =>
          active &&
          setError(
            err instanceof Error
              ? err.message
              : "Could not load the dashboard.",
          ),
      );
    return () => {
      active = false;
    };
  }, [auth.session]);

  async function act(body: Record<string, unknown>, done: string) {
    setError("");
    setNotice("");
    try {
      await call("/api/admin/actions", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setNotice(done);
      await Promise.all([load(), searchUsers(query)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The action failed.");
    }
  }

  function toggle(key: "maintenance" | "transcription", value: boolean) {
    const label =
      key === "maintenance"
        ? value
          ? "Pause new notes for every student?"
          : "Resume new notes?"
        : value
          ? "Turn speech-to-text (Groq) back on?"
          : "Turn speech-to-text off? Gemini will listen to every recording (more expensive).";
    if (!window.confirm(label)) return;
    act(
      { action: "set_setting", key, value },
      "Saved. It applies within about 20 seconds.",
    );
  }

  function setPlan(user: UserRow, plan: UserRow["plan"]) {
    const daysText =
      plan === "free"
        ? null
        : window.prompt(
            `Give ${plan} to ${user.email} for how many days? Leave empty for no end date.`,
            "30",
          );
    if (plan !== "free" && daysText === null) return;
    const days = daysText ? Number.parseInt(daysText, 10) : null;
    if (daysText && (!Number.isFinite(days) || (days ?? 0) < 1))
      return setError("Enter a number of days, or leave it empty.");
    act(
      { action: "set_plan", userId: user.id, plan, days },
      `${user.email} is now on ${plan}.`,
    );
  }

  if (!auth.enabled)
    return (
      <main className="shell">
        <AppHeader />
        <p className="warn">Accounts are not set up.</p>
      </main>
    );
  if (auth.loading) return null;
  if (!auth.session) {
    return (
      <main className="shell legal">
        <AppHeader />
        <h1>Admin</h1>
        <p>Sign in with an admin Google account.</p>
        <button
          type="button"
          className="btn primary google"
          onClick={auth.signIn}
        >
          <span aria-hidden="true" className="g">
            G
          </span>
          Continue with Google
        </button>
      </main>
    );
  }

  const s = data?.stats;
  return (
    <main className="shell admin">
      <AppHeader
        account={{
          email: auth.session.user.email ?? "",
          onSignOut: auth.signOut,
        }}
      />
      <div className="admin-head">
        <h1>Admin</h1>
        <button type="button" className="btn" onClick={load} disabled={busy}>
          {busy ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      {error && (
        <p role="alert" className="warn">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="ok">
          {notice}
        </p>
      )}

      {data && s && (
        <>
          <section>
            <h2>Services</h2>
            <div className="checks">
              {data.services.map((c) => (
                <div key={c.name} className={`check ${c.state}`}>
                  <span className="dot" aria-hidden="true" />
                  <div>
                    <strong>{c.name}</strong>
                    <span>
                      {c.state === "ok"
                        ? `Working · ${c.detail}`
                        : c.state === "off"
                          ? `Off · ${c.detail}`
                          : `Problem · ${c.detail}`}
                      {c.ms !== undefined ? ` · ${c.ms} ms` : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2>Controls</h2>
            <div className="controls">
              <div
                className={`control ${data.settings.maintenance ? "danger" : ""}`}
              >
                <div>
                  <strong>
                    New notes{" "}
                    {data.settings.maintenance
                      ? "paused (maintenance)"
                      : "open"}
                  </strong>
                  <span>
                    When paused, students get a clear message and their
                    recordings stay on their phone.
                  </span>
                </div>
                <button
                  type="button"
                  className={`btn ${data.settings.maintenance ? "primary" : "danger"}`}
                  onClick={() =>
                    toggle("maintenance", !data.settings.maintenance)
                  }
                >
                  {data.settings.maintenance ? "Resume" : "Pause"}
                </button>
              </div>
              <div className="control">
                <div>
                  <strong>
                    Speech-to-text (Groq){" "}
                    {data.settings.transcription ? "on" : "off"}
                  </strong>
                  <span>
                    On: recordings are transcribed, then Gemini reads text
                    (cheaper). Off: Gemini listens to the audio.
                  </span>
                </div>
                <button
                  type="button"
                  className="btn"
                  onClick={() =>
                    toggle("transcription", !data.settings.transcription)
                  }
                >
                  {data.settings.transcription ? "Turn off" : "Turn on"}
                </button>
              </div>
            </div>
          </section>

          <section>
            <h2>Numbers</h2>
            <div className="tiles">
              <Tile
                label="Users"
                value={s.users.total}
                sub={`+${s.users.new7} this week · +${s.users.new30} in 30 days`}
              />
              <Tile
                label="Active this week"
                value={s.users.active7}
                sub="signed in during the last 7 days"
              />
              <Tile
                label="Classes today"
                value={s.classes.today}
                sub={`${s.classes.last7} this week · ${s.classes.last30} in 30 days`}
              />
              <Tile
                label="Failed (7 days)"
                value={s.classes.failed7}
                sub={`${s.classes.processing} being written now`}
                warn={s.classes.failed7 > 0}
              />
              <Tile
                label="Hours recorded this month"
                value={s.month.hours}
                sub={`${s.month.classes} classes · ${s.month.byPath.transcript} via speech-to-text, ${s.month.byPath.audio} via audio`}
              />
              <Tile
                label="AI cost this month (estimate)"
                value={usd(s.month.aiCostUsd)}
                sub="from public prices; see Google and Groq for the real bill"
              />
              <Tile
                label="Students per plan"
                value={`${s.plans.free} / ${s.plans.premium} / ${s.plans.pro}`}
                sub="Free / Premium / Pro"
              />
              <Tile
                label="Paying (Paddle)"
                value={s.paid.premium + s.paid.pro}
                sub={`≈ ${usd(s.paid.monthlyRevenueUsd)} a month before tax and fees`}
              />
            </div>
          </section>

          <section>
            <h2>Users</h2>
            <form
              className="search"
              onSubmit={(e) => {
                e.preventDefault();
                searchUsers(query);
              }}
            >
              <input
                id="admin-user-search"
                type="search"
                placeholder="Search by email"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button type="submit" className="btn">
                Search
              </button>
            </form>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Plan</th>
                    <th>This month</th>
                    <th>Last sign-in</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(users ?? []).map((u) => (
                    <tr key={u.id}>
                      <td className="mono">{u.email}</td>
                      <td>
                        {u.plan}
                        {u.provider === "paddle" ? (
                          <span className="tag">Paddle</span>
                        ) : u.provider === "manual" ? (
                          <span className="tag">given</span>
                        ) : null}
                        {u.expiresAt ? (
                          <div className="muted small">
                            until {when(u.expiresAt)}
                          </div>
                        ) : null}
                      </td>
                      <td>
                        {u.classesThisMonth} classes · {u.hoursThisMonth} h
                      </td>
                      <td>{when(u.lastSignInAt)}</td>
                      <td>{when(u.createdAt)}</td>
                      <td className="actions">
                        <select
                          id={`plan-${u.id}`}
                          aria-label={`Change the plan of ${u.email}`}
                          value=""
                          onChange={(e) =>
                            e.target.value &&
                            setPlan(u, e.target.value as UserRow["plan"])
                          }
                        >
                          <option value="">Set plan…</option>
                          <option value="free">Free</option>
                          <option value="premium">Premium</option>
                          <option value="pro">Pro</option>
                        </select>
                        <button
                          type="button"
                          className="link"
                          onClick={() =>
                            window.confirm(
                              `Reset this month's classes for ${u.email}?`,
                            ) &&
                            act(
                              { action: "reset_usage", userId: u.id },
                              `Usage reset for ${u.email}.`,
                            )
                          }
                        >
                          Reset month
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {users?.length === 0 && <p className="muted">No users match.</p>}
          </section>

          <section>
            <h2>Recent failures</h2>
            {data.failures.length === 0 ? (
              <p className="muted">No failed classes.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Student</th>
                      <th>Message shown</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.failures.map((f) => (
                      <tr key={f.id}>
                        <td>{when(f.created_at)}</td>
                        <td className="mono">{f.email}</td>
                        <td>{f.error ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="muted small">
              Technical details are in Vercel → Logs (search “[notes]”) and in
              Sentry for app crashes.
            </p>
          </section>

          <section>
            <h2>Server settings</h2>
            <p className="muted small">
              Set in Vercel → Settings → Environments. Only “set / missing” is
              shown here, never the values.
            </p>
            <div className="config">
              {data.config.map((c) => (
                <span
                  key={c.name}
                  className={`cfg ${c.set ? "set" : "missing"}`}
                >
                  {c.set ? "✓" : "✗"} {c.name}
                  {c.secret ? " 🔒" : ""}
                </span>
              ))}
            </div>
          </section>

          <section>
            <h2>Admin history</h2>
            {data.audit.length === 0 ? (
              <p className="muted">No admin actions yet.</p>
            ) : (
              <ul className="history">
                {data.audit.map((a, i) => (
                  <li key={i}>
                    <span className="muted">{when(a.created_at)}</span> ·{" "}
                    {a.admin_email} · <strong>{a.action}</strong>
                    {a.target ? ` · ${a.target}` : ""}
                    {a.details ? ` · ${JSON.stringify(a.details)}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}

function Tile({
  label,
  value,
  sub,
  warn,
}: {
  label: string;
  value: string | number;
  sub: string;
  warn?: boolean;
}) {
  return (
    <div className={`tile ${warn ? "warn-tile" : ""}`}>
      <span className="tile-label">{label}</span>
      <span className="tile-value">{value}</span>
      <span className="tile-sub">{sub}</span>
    </div>
  );
}
