"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { Avatar, StoryAvatar } from "@/components/ui/Avatar";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import { formatMessageTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useApp } from "@/components/providers/AppProviders";

export type InboxRow = {
  id: string;
  lastMessageAt: string;
  unreadCount: number;
  yourTurn?: boolean;
  lastMessage: { body: string; kind: string; senderId: string; createdAt: string } | null;
  other: { id: string; name: string; verified: boolean; photo: string | null; online: boolean; lastActiveAt?: string };
};

type MatchRow = {
  id: string;
  conversation: { id: string } | null;
  lowUser: { id: string; profile: { displayName: string; photos: { mediumKey: string }[] } | null };
  highUser: { id: string; profile: { displayName: string; photos: { mediumKey: string }[] } | null };
};

export function ConversationList({ activeId }: { activeId?: string }) {
  const { me } = useApp();
  const [rows, setRows] = useState<InboxRow[] | null>(null);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const path = usePathname();
  const current = activeId ?? (path.startsWith("/app/chat/") ? path.slice("/app/chat/".length) : undefined);

  useEffect(() => {
    api<InboxRow[]>("/api/chat")
      .then(setRows)
      .catch(() => setRows([]));
    api<MatchRow[]>("/api/chat?type=matches")
      .then(setMatches)
      .catch(() => setMatches([]));
    const t = setInterval(() => {
      api<InboxRow[]>("/api/chat").then(setRows).catch(() => undefined);
    }, 8000);
    return () => clearInterval(t);
  }, []);

  if (!rows) {
    return (
      <div className="space-y-2 p-3">
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-16 rounded-2xl" />
      </div>
    );
  }

  return (
    <div>
      {matches.length ? (
        <div className="px-4 pb-3">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/40">New Matches</h2>
          <div className="flex gap-3 overflow-x-auto no-scrollbar">
            {matches.map((row) => {
              const other = row.lowUser.id === me?.id ? row.highUser : row.lowUser;
              const photo = other.profile?.photos[0]?.mediumKey ? `/api/media/${other.profile.photos[0].mediumKey}` : null;
              return (
                <Link key={row.id} href={row.conversation ? `/app/chat/${row.conversation.id}` : "/app/chat"} className="w-16 shrink-0 text-center">
                  <StoryAvatar src={photo} name={other.profile?.displayName ?? "Match"} size={56} />
                  <p className="mt-1 truncate text-[11px]">{other.profile?.displayName}</p>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      {!rows.length ? (
        <EmptyState title="No messages yet" body="When you match, the conversation starts here." />
      ) : (
        <ul>
          {rows.map((row) => {
            const unread = row.unreadCount > 0;
            return (
              <li key={row.id}>
                <Link
                  href={`/app/chat/${row.id}`}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 transition hover:bg-white/5 active:scale-[0.99]",
                    current === row.id && "bg-white/8",
                  )}
                >
                  <Avatar src={row.other.photo} name={row.other.name} online={row.other.online} verified={row.other.verified} size={56} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn("truncate", unread ? "font-bold" : "font-semibold")}>{row.other.name}</p>
                      <span className="shrink-0 text-[11px] text-white/45">{formatMessageTime(row.lastMessageAt)}</span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <p className={cn("truncate text-sm", unread ? "text-white/90" : "text-white/50")}>
                        {row.lastMessage?.body || "Say hello"}
                      </p>
                      {unread ? (
                        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-flirty-pink px-1 text-[10px] font-bold">
                          {row.unreadCount > 9 ? "9+" : row.unreadCount}
                        </span>
                      ) : row.yourTurn ? (
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-flirty-pink">Your turn</span>
                      ) : null}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
