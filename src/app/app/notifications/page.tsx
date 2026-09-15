"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { EmptyState } from "@/components/ui/EmptyState";

type Note = { id: string; title: string; body: string; createdAt: string; readAt: string | null };

export default function NotificationsPage() {
  const [rows, setRows] = useState<Note[]>([]);
  useEffect(() => {
    api<Note[]>("/api/settings").then(setRows);
  }, []);
  if (!rows.length) return <EmptyState title="You're all caught up" body="New Flirts, matches and messages will appear here." />;
  return (
    <section>
      <h1 className="text-2xl font-bold">Notifications</h1>
      <ul className="mt-4 space-y-2">
        {rows.map((n) => (
          <li key={n.id} className="rounded-2xl bg-white/5 px-4 py-3">
            <p className="font-semibold">{n.title}</p>
            <p className="text-sm text-white/60">{n.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
