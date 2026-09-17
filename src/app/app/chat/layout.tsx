"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConversationList } from "@/features/chat/ConversationList";
import { cn } from "@/lib/cn";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const inThread = /^\/app\/chat\/[^/]+/.test(path);
  return (
    <div className="flex min-h-dvh md:min-h-[calc(100dvh-3rem)] md:overflow-hidden md:rounded-[2rem] md:border md:border-white/10">
      <aside className={cn("w-full shrink-0 md:w-[340px] md:border-r md:border-white/10", inThread && "hidden md:block")}>
        <div className="flex items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold">Messages</h1>
          <Link href="/app/discover" className="text-xs text-white/50 hover:text-white">
            Discover
          </Link>
        </div>
        <ConversationList />
      </aside>
      <div className={cn("min-w-0 flex-1", !inThread && "hidden md:block")}>{children}</div>
    </div>
  );
}
