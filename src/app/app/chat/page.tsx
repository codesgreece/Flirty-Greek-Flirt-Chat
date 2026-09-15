"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { EmptyState } from "@/components/ui/EmptyState";
import { useApp } from "@/components/providers/AppProviders";

type Conversation = {
  id: string;
  lastMessageAt: string;
  messages: { body: string; createdAt: string }[];
  userA: { id: string; profile: { displayName: string } | null };
  userB: { id: string; profile: { displayName: string } | null };
};

export default function ChatListPage() {
  const { me } = useApp();
  const [rows, setRows] = useState<Conversation[]>([]);
  useEffect(() => {
    api<Conversation[]>("/api/chat").then(setRows);
  }, []);
  if (!rows.length) {
    return <EmptyState title="No conversations" body="Matches turn into chats. Start with a Flirt." />;
  }
  return (
    <section>
      <h1 className="text-2xl font-bold">Chat</h1>
      <ul className="mt-4 space-y-2">
        {rows.map((row) => {
          const other = row.userA.id === me?.id ? row.userB : row.userA;
          return (
            <li key={row.id}>
              <Link href={`/app/chat/${row.id}`} className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-4">
                <div>
                  <p className="font-semibold">{other.profile?.displayName}</p>
                  <p className="text-sm text-white/50">{row.messages[0]?.body ?? "Say hello"}</p>
                </div>
                <span className="text-xs text-white/40">{new Date(row.lastMessageAt).toLocaleDateString()}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
