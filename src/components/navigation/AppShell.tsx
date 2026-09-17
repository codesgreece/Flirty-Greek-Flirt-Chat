"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Heart, MessageCircle, UserRound } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { FlirtyWordmark } from "@/components/brand/FlirtyLogo";

const tabs = [
  { href: "/app/discover", label: "Discover", icon: Flame },
  { href: "/app/likes", label: "Likes", icon: Heart },
  { href: "/app/chat", label: "Messages", icon: MessageCircle },
  { href: "/app/profile", label: "Profile", icon: UserRound },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const hideChrome = path.startsWith("/app/chat/") || path.startsWith("/app/profile/edit");
  const chatDesktop = path.startsWith("/app/chat");
  return (
    <div className="mx-auto flex min-h-dvh max-w-[90rem]">
      <aside className={cn("hidden w-64 flex-col border-r border-white/10 p-5 md:flex", chatDesktop && "xl:hidden")}>
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
        {!hideChrome ? (
          <header className="flex items-center justify-between px-4 py-3 md:hidden" style={{ paddingTop: "calc(12px + var(--safe-top))" }}>
            <FlirtyWordmark />
          </header>
        ) : null}
        <div className={cn("flex-1", hideChrome ? "" : "px-4 py-2 md:px-8 md:py-6")}>{children}</div>
        <nav
          className={cn(
            "fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-black/70 backdrop-blur-xl md:hidden",
            hideChrome && "hidden",
          )}
          style={{ paddingBottom: "var(--safe-bottom)" }}
        >
          <div className="grid grid-cols-4">
            {tabs.map((tab) => {
              const active = path.startsWith(tab.href);
              return (
                <Link key={tab.href} href={tab.href} className="flex flex-col items-center gap-1 py-3 text-[11px]">
                  <motion.span
                    animate={{ scale: active ? 1.08 : 1, opacity: active ? 1 : 0.55 }}
                    className={cn(active && "text-flirty-pink drop-shadow-[0_0_10px_rgba(255,61,138,0.6)]")}
                  >
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
