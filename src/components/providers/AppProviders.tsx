"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ToastHost, type Toast } from "@/components/ui/Toast";
import { CookieBanner } from "@/components/ui/CookieBanner";
import { FlirtyLogo } from "@/components/brand/FlirtyLogo";
import { api } from "@/lib/api";

export type Me = {
  id: string;
  email: string;
  isAdmin: boolean;
  onboardingComplete: boolean;
  onboardingStep: number;
  profile: {
    name: string;
    age: number;
    verified: boolean;
    bio: string;
    city: string;
    intention: string;
    photos: { id: string; src: string }[];
    interests: string[];
    vibes: string[];
    incognito: boolean;
  } | null;
  entitlements: {
    plan: "FREE" | "PLUS" | "GOLD" | "PLATINUM";
    capabilities: Record<string, boolean>;
    limits: Record<string, unknown>;
  };
  usage: Record<string, { used: number; limit: number | null }>;
  privacy: {
    showDistance: boolean;
    showOnline: boolean;
    discoveryVisible: boolean;
  } | null;
  boost: { expiresAt: string } | null;
};

type AppCtx = {
  me: Me | null;
  loading: boolean;
  refresh: () => Promise<void>;
  toast: (message: string) => void;
};

const Ctx = createContext<AppCtx | null>(null);

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [boot, setBoot] = useState(true);

  async function refresh() {
    const data = await api<{ user: Me | null }>("/api/auth");
    setMe(data.user);
  }

  useEffect(() => {
    refresh()
      .catch(() => setMe(null))
      .finally(() => setLoading(false));
    const t = setTimeout(() => setBoot(false), 900);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    return () => clearTimeout(t);
  }, []);

  const value = useMemo<AppCtx>(
    () => ({
      me,
      loading,
      refresh,
      toast: (message) =>
        setToasts((list) => [...list.slice(-3), { id: crypto.randomUUID(), message }]),
    }),
    [me, loading],
  );

  return (
    <Ctx.Provider value={value}>
      <AnimatePresence>
        {boot && (
          <motion.div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-[#07040d]"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <FlirtyLogo className="mx-auto h-20 w-20" />
              <p className="mt-4 text-3xl font-extrabold">
                FLIRT<span className="text-flirty-pink">Y</span>
              </p>
              <p className="mt-1 text-xs uppercase tracking-[0.28em] text-white/50">Meet • Flirt • Belong</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {children}
      <CookieBanner />
      <ToastHost toasts={toasts} onDismiss={(id) => setToasts((list) => list.filter((t) => t.id !== id))} />
    </Ctx.Provider>
  );
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("AppProviders missing");
  return ctx;
}
