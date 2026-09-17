"use client";

import { usePathname } from "next/navigation";
import { ConversationList } from "@/features/chat/ConversationList";
import { cn } from "@/lib/cn";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const inThread = /^\/app\/chat\/[^/]+/.test(path);
  return (
    <div className="flex min-h-dvh md:min-h-[calc(100dvh-3rem)] md:overflow-hidden md:rounded-[2rem] md:border md:border-white/10">
      <aside className={cn("w-full shrink-0 md:w-[340px] md:border-r md:border-white/10", inThread && "hidden md:block")}>
        <div className="px-4 py-4">
          <h1 className="text-2xl font-extrabold">Messages</h1>
        </div>
        <ConversationList />
      </aside>
      <div className={cn("min-w-0 flex-1", !inThread && "hidden md:block")}>{children}</div>
    </div>
  );
}
