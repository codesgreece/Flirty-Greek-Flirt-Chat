"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Heart, MessageCircle, UserRound } from "lucide-react";
import { cn } from "@/lib/cn";
import { FlirtyWordmark } from "@/components/brand/FlirtyLogo";

const tabs = [
  { href: "/app/discover", label: "Discover", icon: Flame },
  { href: "/app/likes", label: "Likes", icon: Heart },
  { href: "/app/chat", label: "Chat", icon: MessageCircle },
  { href: "/app/profile", label: "Profile", icon: UserRound },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const hideChrome =
    path.startsWith("/app/chat/") || path.startsWith("/app/profile/edit") || path.startsWith("/app/u/");
  const deck = path.startsWith("/app/discover");
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
      <div
        className={cn(
          "flex min-h-dvh flex-1 flex-col",
          hideChrome ? "" : "pb-[calc(4.35rem+var(--safe-bottom))] md:pb-0",
        )}
      >
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col",
            hideChrome ? "" : deck ? "px-3" : "px-4 pb-3 md:px-8 md:py-6",
          )}
          style={hideChrome ? undefined : { paddingTop: "max(0.5rem, var(--safe-top))" }}
        >
          {children}
        </div>
        <nav
          className={cn(
            "fixed inset-x-0 bottom-0 z-30 bg-black/90 backdrop-blur-xl md:hidden",
            hideChrome && "hidden",
          )}
          style={{ paddingBottom: "var(--safe-bottom)" }}
        >
          <div className="grid grid-cols-4">
            {tabs.map((tab) => {
              const active = path.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-label={tab.label}
                  className="flex flex-col items-center gap-0.5 py-2.5"
                  aria-current={active ? "page" : undefined}
                >
                  <tab.icon
                    className={cn("h-6 w-6", active ? "text-flirty-pink" : "text-white/40")}
                    fill={active ? "currentColor" : "none"}
                    strokeWidth={active ? 2.4 : 1.8}
                  />
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
