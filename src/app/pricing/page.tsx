"use client";

import Link from "next/link";
import { FlirtyButton } from "@/components/ui/FlirtyButton";
import { api } from "@/lib/api";
import { useApp } from "@/components/providers/AppProviders";
const PLAN_COPY = {
  FREE: { name: "Free", price: "€0", tagline: "Start discovering your people." },
  PLUS: { name: "Plus", price: "€7.99", tagline: "More Flirts. More second chances." },
  GOLD: { name: "Gold", price: "€14.99", tagline: "See who already wants you." },
  PLATINUM: { name: "Platinum", price: "€24.99", tagline: "Maximum presence. First word." },
} as const;

const PLAN_ORDER = ["FREE", "PLUS", "GOLD", "PLATINUM"] as const;

export default function PricingPage() {
  const { me, toast, refresh } = useApp();
  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <p className="text-xs uppercase tracking-[0.25em] text-white/50">FLIRTY plans</p>
      <h1 className="mt-3 text-4xl font-extrabold">Choose how you show up.</h1>
      <p className="mt-3 max-w-xl text-white/65">Gold is the sweet spot. Platinum is for when you want the first word.</p>
      <div className="mt-10 grid gap-4 md:grid-cols-4">
        {PLAN_ORDER.map((code) => {
          const copy = PLAN_COPY[code];
          const featured = code === "GOLD";
          return (
            <article key={code} className={`rounded-[2rem] p-5 ${featured ? "bg-gradient-to-b from-amber-300/20 to-white/5 ring-2 ring-amber-300/50" : "bg-white/5"}`}>
              <p className="text-sm uppercase tracking-wide text-white/50">{copy.name}</p>
              <p className="mt-2 text-3xl font-bold">{copy.price}<span className="text-sm text-white/50">/mo</span></p>
              <p className="mt-2 text-sm text-white/70">{copy.tagline}</p>
              <ul className="mt-4 space-y-2 text-sm text-white/75">
                {code === "FREE" && ["50 likes/day", "Limited Flirts", "1 rewind/day", "1 Super Like/week", "1 Direct Message/day"].map((f) => <li key={f}>{f}</li>)}
                {code === "PLUS" && ["Unlimited likes & Flirts", "Unlimited rewinds", "5 Super Likes/week", "3 DMs/day", "Passport & Incognito"].map((f) => <li key={f}>{f}</li>)}
                {code === "GOLD" && ["See who likes you", "Top Picks", "10 Super Likes/week", "10 DMs/day", "1 Boost/month", "Super Flirts"].map((f) => <li key={f}>{f}</li>)}
                {code === "PLATINUM" && ["Unlimited DMs", "20 Super Likes/week", "2 Boosts/month", "Priority visibility", "First message before match"].map((f) => <li key={f}>{f}</li>)}
              </ul>
              <FlirtyButton
                className="mt-6 w-full"
                variant={featured ? "gold" : "ghost"}
                onClick={() =>
                  api("/api/subscriptions", {
                    method: "POST",
                    body: JSON.stringify({ plan: code, idempotencyKey: crypto.randomUUID() }),
                  })
                    .then(async () => {
                      toast(`${copy.name} activated`);
                      await refresh();
                    })
                    .catch((e) => toast(e.message))
                }
              >
                {me?.entitlements.plan === code ? "Current plan" : "Use this plan"}
              </FlirtyButton>
            </article>
          );
        })}
      </div>
      <p className="mt-8 text-sm text-white/45">
        Development billing adapter is active. No card numbers are stored. A payment provider can be connected without rewriting entitlements.
      </p>
      <Link href="/" className="mt-6 inline-block text-sm text-white/60">Back home</Link>
    </main>
  );
}
