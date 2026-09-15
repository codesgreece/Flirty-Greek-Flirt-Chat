"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FlirtyWordmark } from "@/components/brand/FlirtyLogo";
import { StoreBadges } from "@/components/brand/StoreBadges";
import { FlirtyButton } from "@/components/ui/FlirtyButton";

const cards = [
  { name: "Elena", age: 29, vibe: "Romantic", score: 94, delay: 0, y: -10 },
  { name: "Nikos", age: 31, vibe: "Adventurous", score: 88, delay: 0.4, y: 10 },
  { name: "Sofia", age: 27, vibe: "Creative", score: 91, delay: 0.8, y: -6 },
];

export function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-white/5 bg-black/20 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <FlirtyWordmark />
          <nav className="hidden items-center gap-6 text-sm text-white/70 md:flex">
            <a href="#discover">Discover</a>
            <a href="#how">How It Works</a>
            <a href="#features">Features</a>
            <a href="/safety">Safety</a>
            <a href="/pricing">Pricing</a>
            <Link href="/auth?mode=login" className="rounded-full px-4 py-2 hover:bg-white/5">
              Login
            </Link>
            <Link href="/auth?mode=register" className="rounded-full bg-flirty-pink px-4 py-2 font-semibold text-white">
              Create Account
            </Link>
          </nav>
          <Link href="/auth?mode=register" className="md:hidden rounded-full bg-flirty-pink px-4 py-2 text-sm font-semibold">
            Join
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 md:grid-cols-2 md:py-24">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-white/50">Meet • Flirt • Belong</p>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight md:text-6xl">
            Meet someone <span className="gradient-text">worth staying for.</span>
          </h1>
          <p className="mt-5 max-w-md text-lg text-white/70">
            Discover people, find your Vibe, make the first Flirt and create real connections.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/auth?mode=register">
              <FlirtyButton type="button">Create account</FlirtyButton>
            </Link>
            <Link href="/auth?mode=login">
              <FlirtyButton type="button" variant="ghost">Log in</FlirtyButton>
            </Link>
          </div>
          <StoreBadges className="mt-8" />
        </div>
        <div className="relative h-[420px]">
          {cards.map((card, i) => (
            <motion.article
              key={card.name}
              className="glass absolute left-1/2 w-56 -translate-x-1/2 rounded-3xl p-4"
              style={{ top: 40 + i * 36, rotate: i === 1 ? -8 : i === 2 ? 8 : 3, zIndex: 3 - i }}
              animate={{ y: [card.y, -card.y, card.y] }}
              transition={{ duration: 7 + i, repeat: Infinity, delay: card.delay, ease: "easeInOut" }}
            >
              <div className="h-40 rounded-2xl bg-gradient-to-br from-pink-400/40 to-indigo-600/40" />
              <p className="mt-3 font-bold">
                {card.name}, {card.age}
              </p>
              <p className="text-xs text-white/60">{card.vibe} vibe</p>
              <p className="mt-2 text-sm font-semibold text-flirty-pink">{card.score}% FLIRTY MATCH</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-3xl font-bold">How FLIRTY works</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {[
            ["Discover", "Profiles chosen for Vibe, intention and chemistry — not a leftover stack."],
            ["Flirt", "The signature move. A Flirt is warmer than a like, clearer than a swipe."],
            ["Compatibility", "A private score from interests, Vibe, lifestyle and distance."],
            ["Belong", "Match, talk, and keep the connection on your terms."],
          ].map(([title, copy]) => (
            <article key={title} className="glass rounded-3xl p-5">
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-white/65">{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-5 pb-24">
        <h2 className="text-3xl font-bold">Designed for chemistry</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            "Vibe profiles that actually rank recommendations",
            "Super Flirt — Super Like plus a first message",
            "Passport, Incognito, Boost and Top Picks",
            "Realtime chat with presence and typing",
            "Safety tools, blocks, reports, verification",
            "Your data stays on FLIRTY infrastructure",
          ].map((item) => (
            <div key={item} className="glass rounded-3xl p-5 text-sm text-white/80">
              {item}
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 px-5 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <FlirtyWordmark />
          <div className="flex gap-4 text-sm text-white/50">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/cookies">Cookies</Link>
            <Link href="/safety">Safety</Link>
            <Link href="/pricing">Pricing</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
