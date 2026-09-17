"use client";

import Link from "next/link";
import { ConversationList } from "@/features/chat/ConversationList";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh md:min-h-[calc(100dvh-3rem)] md:overflow-hidden md:rounded-[2rem] md:border md:border-white/10">
      <aside className="hidden w-[340px] shrink-0 border-r border-white/10 md:block">
        <div className="flex items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold">Messages</h1>
          <Link href="/app/discover" className="text-xs text-white/50 hover:text-white">
            Discover
          </Link>
        </div>
        <ConversationList />
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
