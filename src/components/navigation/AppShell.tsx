"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Heart, MessageCircle, Sparkles, UserRound } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { FlirtyWordmark } from "@/components/brand/FlirtyLogo";

const tabs = [
  { href: "/app/discover", label: "Discover", icon: Compass },
  { href: "/app/likes", label: "Likes", icon: Heart },
  { href: "/app/flirts", label: "Flirts", icon: Sparkles },
  { href: "/app/chat", label: "Chat", icon: MessageCircle },
  { href: "/app/profile", label: "Profile", icon: UserRound },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl">
      <aside className="hidden w-64 flex-col border-r border-white/10 p-5 md:flex">
        <FlirtyWordmark />
        <nav className="mt-8 space-y-1">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm",
                path.startsWith(tab.href) ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5",
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </Link>
          ))}
          <Link href="/app/notifications" className="mt-6 block rounded-2xl px-4 py-3 text-sm text-white/60 hover:bg-white/5">
            Notifications
          </Link>
          <Link href="/pricing" className="block rounded-2xl px-4 py-3 text-sm text-white/60 hover:bg-white/5">
            Plans
          </Link>
        </nav>
      </aside>
      <div className="flex min-h-dvh flex-1 flex-col pb-24 md:pb-0">
        <header className="flex items-center justify-between px-4 py-3 md:hidden" style={{ paddingTop: "calc(12px + var(--safe-top))" }}>
          <FlirtyWordmark />
        </header>
        <div className="flex-1 px-4 py-2 md:px-8 md:py-6">{children}</div>
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-black/70 backdrop-blur-xl md:hidden" style={{ paddingBottom: "var(--safe-bottom)" }}>
          <div className="grid grid-cols-5">
            {tabs.map((tab) => {
              const active = path.startsWith(tab.href);
              return (
                <Link key={tab.href} href={tab.href} className="flex flex-col items-center gap-1 py-3 text-[11px]">
                  <motion.span animate={{ scale: active ? 1.08 : 1, opacity: active ? 1 : 0.55 }} className={cn(active && "text-flirty-pink drop-shadow-[0_0_10px_rgba(255,61,138,0.6)]")}>
                    <tab.icon className="h-5 w-5" />
                  </motion.span>
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
