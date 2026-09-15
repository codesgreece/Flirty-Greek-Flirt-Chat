"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { FlirtyButton } from "@/components/ui/FlirtyButton";

export default function AdminPage() {
  const [overview, setOverview] = useState<Record<string, number> | null>(null);
  const [users, setUsers] = useState<Array<{ id: string; email: string; status: string; profile: { displayName: string } | null }>>([]);
  const [reports, setReports] = useState<Array<{ id: string; category: string; status: string }>>([]);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setOverview(await api("/api/admin?section=overview"));
    setUsers(await api(`/api/admin?section=users&q=${encodeURIComponent(q)}`));
    setReports(await api("/api/admin?section=reports"));
  }, [q]);
  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <h1 className="text-3xl font-bold">Control center</h1>
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
