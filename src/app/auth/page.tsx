"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FlirtyWordmark } from "@/components/brand/FlirtyLogo";
import { FlirtyButton } from "@/components/ui/FlirtyButton";
import { api, ApiError } from "@/lib/api";
import { useApp } from "@/components/providers/AppProviders";

function AuthForm() {
  const params = useSearchParams();
  const { refresh, toast } = useApp();
  const [mode, setMode] = useState(params.get("mode") === "login" ? "login" : "register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await api<{ onboardingComplete?: boolean; isAdmin?: boolean }>(
        "/api/auth?action=" + (mode === "login" ? "login" : "register"),
        {
          method: "POST",
          body: JSON.stringify({ email, password }),
        },
      );
      const next = result.isAdmin ? "/admin" : result.onboardingComplete ? "/app/discover" : "/onboarding";
      try {
        await refresh();
      } catch {
        /* still enter the app after a successful login */
      }
      toast(mode === "login" ? "Welcome back" : "Account created");
      window.location.assign(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not continue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <FlirtyWordmark />
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, x: mode === "register" ? 16 : -16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: mode === "register" ? -16 : 16 }}
          transition={{ duration: 0.22 }}
        >
          <h1 className="mt-10 text-3xl font-bold">{mode === "login" ? "Welcome back" : "Create your FLIRTY"}</h1>
          <p className="mt-2 text-white/60">
            {mode === "login" ? "Pick up where the chemistry left off." : "Start with a private account. You are 18+ only."}
          </p>
          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <label className="block text-sm">
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-flirty-pink"
              />
            </label>
            <label className="block text-sm">
              Password
              <input
                type="password"
                required
                minLength={10}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-flirty-pink"
              />
            </label>
            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            <FlirtyButton type="submit" className="w-full" loading={loading} disabled={loading}>
              {mode === "login" ? "Log in" : "Create account"}
            </FlirtyButton>
          </form>
          <button
            type="button"
            className="mt-6 text-sm text-white/60"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login" ? "Need an account? Create one" : "Already on FLIRTY? Log in"}
          </button>
        </motion.div>
      </AnimatePresence>
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  );
}
