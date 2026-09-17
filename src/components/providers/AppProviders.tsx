"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ToastHost, type Toast } from "@/components/ui/Toast";
import { CookieBanner } from "@/components/ui/CookieBanner";
import { IncomingCallListener } from "@/features/chat/IncomingCallListener";
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
    gender?: string;
    seeking?: string[];
    photos: { id: string; src: string; thumb?: string; isPrimary?: boolean; sortOrder?: number }[];
    interests: string[];
    interestSlugs?: string[];
    vibes: string[];
    vibeCodes?: string[];
    incognito: boolean;
    jobTitle?: string;
    education?: string;
    languages?: string[];
    lifestyle?: Record<string, string>;
  } | null;
  preference?: {
    minAge: number;
    maxAge: number;
    maxDistanceKm: number;
    genders: string[];
    intentions?: string[];
    verifiedOnly?: boolean;
    hasPhotosOnly?: boolean;
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

  async function refresh() {
    const data = await api<{ user: Me | null }>("/api/auth");
    setMe(data.user);
  }

  useEffect(() => {
    refresh()
      .catch(() => setMe(null))
      .finally(() => setLoading(false));
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
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
      {children}
      <CookieBanner />
      {me ? <IncomingCallListener /> : null}
      <ToastHost toasts={toasts} onDismiss={(id) => setToasts((list) => list.filter((t) => t.id !== id))} />
    </Ctx.Provider>
  );
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("AppProviders missing");
  return ctx;
}
