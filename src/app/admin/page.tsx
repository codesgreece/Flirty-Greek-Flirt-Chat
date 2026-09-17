"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { FlirtyButton } from "@/components/ui/FlirtyButton";

export default function AdminPage() {
  const [overview, setOverview] = useState<Record<string, number> | null>(null);
  const [users, setUsers] = useState<Array<{ id: string; email: string; status: string; profile: { displayName: string } | null }>>([]);
  const [reports, setReports] = useState<Array<{ id: string; category: string; status: string }>>([]);
  const [q, setQ] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  const load = useCallback(async () => {
    const [overviewRow, userRows, reportRows] = await Promise.all([
      api<Record<string, number>>("/api/admin?section=overview"),
      api<Array<{ id: string; email: string; status: string; profile: { displayName: string } | null }>>(
        `/api/admin?section=users&q=${encodeURIComponent(q)}`,
      ),
      api<Array<{ id: string; category: string; status: string }>>("/api/admin?section=reports"),
    ]);
    setOverview(overviewRow);
    setUsers(userRows);
    setReports(reportRows);
  }, [q]);
  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await api("/api/auth?action=logout", { method: "POST", body: "{}" });
    } catch {
      /* still leave the session on the client */
    }
    window.location.assign("/auth?mode=login");
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <header className="flex items-start justify-between gap-4">
        <h1 className="text-3xl font-bold">Control center</h1>
        <FlirtyButton type="button" variant="ghost" loading={loggingOut} disabled={loggingOut} onClick={logout}>
          Log out
        </FlirtyButton>
      </header>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {overview &&
          Object.entries(overview).map(([k, v]) => (
            <article key={k} className="rounded-3xl bg-white/5 p-4">
              <p className="text-xs uppercase text-white/40">{k}</p>
              <p className="mt-2 text-2xl font-bold">{String(v)}</p>
            </article>
          ))}
      </div>
      <div className="mt-8 flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} className="flex-1 rounded-2xl bg-white/5 px-4" placeholder="Search members" />
        <FlirtyButton onClick={load}>Search</FlirtyButton>
      </div>
      <ul className="mt-4 space-y-2">
        {users.map((u) => (
          <li key={u.id} className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
            <span>
              {u.profile?.displayName} · {u.email} · {u.status}
            </span>
            <button
              className="text-sm text-rose-300"
              onClick={() => api("/api/admin", { method: "POST", body: JSON.stringify({ userId: u.id, status: "SUSPENDED" }) }).then(load)}
            >
              Suspend
            </button>
          </li>
        ))}
      </ul>
      <h2 className="mt-10 font-semibold">Open reports</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {reports.map((r) => (
          <li key={r.id} className="rounded-2xl bg-white/5 px-4 py-3">
            {r.category} · {r.status}
          </li>
        ))}
      </ul>
    </main>
  );
}
