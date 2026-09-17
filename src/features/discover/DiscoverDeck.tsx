"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { RotateCcw, Star, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useApp } from "@/components/providers/AppProviders";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import { MatchModal } from "@/features/discover/MatchModal";
import { UpgradeModal } from "@/components/ui/Modal";
import { useRouter } from "next/navigation";
import { motionTokens } from "@/lib/motion";

export type DiscoverCard = {
  userId: string;
  name: string;
  age: number;
  verified: boolean;
  city: string;
  distanceLabel: string | null;
  intention: string;
  bio: string;
  prompts: { question: string; answer: string }[] | unknown;
  interests: string[];
  vibes: string[];
  photos: { id: string; src: string; thumb: string }[];
  compatibility: { score: number; interests: number; vibe: number; intent: number; lifestyle: number; distance: number };
};

export function DiscoverDeck() {
  const { toast, refresh, me } = useApp();
  const router = useRouter();
  const [cards, setCards] = useState<DiscoverCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [match, setMatch] = useState<{ name: string; score: number; photo?: string } | null>(null);
  const [upgrade, setUpgrade] = useState<{ title: string; body: string; required: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const data = await api<{ cards: DiscoverCard[] }>("/api/discover");
    setCards(data.cards);
    setLoading(false);
  }, []);

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [load]);

  async function act(kind: "FLIRT" | "PASS" | "SUPER_LIKE" | "LIKE", targetId: string) {
    if (busy) return;
    setBusy(true);
    const leaving = cards[0];
    setCards((list) => list.slice(1));
    try {
      const result = await api<{ match: { compatibility?: number } | null }>("/api/flirts", {
        method: "POST",
        body: JSON.stringify({ targetId, kind, idempotencyKey: crypto.randomUUID() }),
      });
      if (kind === "FLIRT") toast("Flirt sent ❤️");
      if (kind === "SUPER_LIKE") toast("Super Like sent 💫");
      if (result.match && leaving) {
        setMatch({
          name: leaving.name,
          score: result.match.compatibility ?? leaving.compatibility.score,
          photo: leaving.photos[0]?.src,
        });
      }
      void refresh();
      if (cards.length < 4) void load();
    } catch (error) {
      if (leaving) setCards((list) => [leaving, ...list]);
      if (error instanceof ApiError && (error.code === "UPGRADE_REQUIRED" || error.code === "LIMIT_REACHED")) {
        setUpgrade({
          title: "You found something worth sending.",
          body: error.message,
          required: me?.entitlements.plan === "FREE" ? "PLUS" : "GOLD",
        });
      } else {
        toast("Connection lost. Trying again…");
      }
    } finally {
      setBusy(false);
    }
  }

  async function rewind() {
    try {
      await api("/api/flirts", { method: "PUT" });
      toast("Rewound");
      await load();
    } catch (error) {
      if (error instanceof ApiError) setUpgrade({ title: "Rewind is limited today", body: error.message, required: "PLUS" });
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-md space-y-4">
        <Skeleton className="h-[520px]" />
        <div className="flex justify-center gap-4">
          <Skeleton className="h-14 w-14 rounded-full" />
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-14 w-14 rounded-full" />
        </div>
      </div>
    );
  }

  if (!cards.length) {
    return (
      <EmptyState
        title="That's the room for now"
        body="Your next connection might be one Flirt away. Check again soon."
        action={<button className="rounded-full bg-white/10 px-4 py-2" onClick={() => load()}>Refresh</button>}
      />
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="relative h-[560px]">
        {cards.slice(0, 3).map((card, index) => (
          <ProfileSwipeCard
            key={card.userId}
            card={card}
            index={index}
            active={index === 0}
            onFlirt={() => act("FLIRT", card.userId)}
            onPass={() => act("PASS", card.userId)}
          />
        ))}
      </div>
      <div className="mt-5 flex items-center justify-center gap-4">
        <button aria-label="Rewind" className="grid h-12 w-12 place-items-center rounded-full bg-white/10" onClick={rewind}>
          <RotateCcw className="h-5 w-5" />
        </button>
        <button aria-label="Pass" className="grid h-14 w-14 place-items-center rounded-full bg-white/10" onClick={() => cards[0] && act("PASS", cards[0].userId)}>
          <X className="h-6 w-6" />
        </button>
        <motion.button
          aria-label="Flirt"
          whileTap={{ scale: 0.9 }}
          className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-flirty-pink to-indigo-500 text-xl shadow-glow"
          onClick={() => cards[0] && act("FLIRT", cards[0].userId)}
        >
          ♥
        </motion.button>
        <button
          aria-label="Super Like"
          className="grid h-14 w-14 place-items-center rounded-full bg-indigo-500/30 text-indigo-200"
          onClick={() => cards[0] && act("SUPER_LIKE", cards[0].userId)}
        >
          <Star className="h-6 w-6" />
        </button>
        <button
          aria-label="Direct Message"
          className="grid h-12 w-12 place-items-center rounded-full bg-amber-300/20 text-amber-100"
          onClick={async () => {
            const card = cards[0];
            if (!card) return;
            const body = window.prompt("Send a message with your Flirt");
            if (!body) return;
            try {
              await api("/api/chat?type=dm", {
                method: "POST",
                body: JSON.stringify({ recipientId: card.userId, body, idempotencyKey: crypto.randomUUID() }),
              });
              toast("Direct Message sent");
            } catch (error) {
              if (error instanceof ApiError) {
                setUpgrade({
                  title: "You found something worth sending.",
                  body: "Direct Messages are available with FLIRTY PLUS.",
                  required: "PLUS",
                });
              }
            }
          }}
        >
          ✉
        </button>
      </div>
      <MatchModal
        open={Boolean(match)}
        name={match?.name ?? ""}
        score={match?.score ?? 0}
        photo={match?.photo}
        onKeep={() => setMatch(null)}
        onMessage={() => {
          setMatch(null);
          router.push("/app/chat");
        }}
      />
      <UpgradeModal
        open={Boolean(upgrade)}
        onClose={() => setUpgrade(null)}
        title={upgrade?.title ?? ""}
        body={upgrade?.body ?? ""}
        required={upgrade?.required ?? "PLUS"}
        onUpgrade={() => router.push("/pricing")}
      />
      {me?.boost ? <p className="mt-4 text-center text-xs text-amber-200">BOOST ACTIVE</p> : null}
    </div>
  );
}

function ProfileSwipeCard({
  card,
  index,
  active,
  onFlirt,
  onPass,
}: {
  card: DiscoverCard;
  index: number;
  active: boolean;
  onFlirt: () => void;
  onPass: () => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-10, 10]);
  const flirtOp = useTransform(x, [40, 140], [0, 1]);
  const passOp = useTransform(x, [-140, -40], [1, 0]);
  const photo = card.photos[0]?.src ?? "/avatars/fallback.svg";
  const prompts = Array.isArray(card.prompts) ? (card.prompts as { question: string; answer: string }[]) : [];

  return (
    <motion.article
      className="absolute inset-0 overflow-hidden rounded-[2rem] border border-white/10 bg-ink-800 shadow-card"
      style={{
        x: active ? x : 0,
        rotate: active ? rotate : 0,
        scale: 1 - index * 0.04,
        y: index * 8,
        zIndex: 10 - index,
      }}
      drag={active ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      transition={motionTokens.cardSpring}
      onDragEnd={(_, info) => {
        if (info.offset.x > 120 || info.velocity.x > 700) onFlirt();
        else if (info.offset.x < -120 || info.velocity.x < -700) onPass();
      }}
    >
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${photo})` }} />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
      <motion.div style={{ opacity: flirtOp }} className="absolute left-5 top-6 rounded-full border-2 border-flirty-pink px-3 py-1 text-sm font-bold text-flirty-pink">
        FLIRT
      </motion.div>
      <motion.div style={{ opacity: passOp }} className="absolute right-5 top-6 rounded-full border-2 border-white/50 px-3 py-1 text-sm font-bold">
        PASS
      </motion.div>
      <div className="absolute inset-x-0 bottom-0 p-5">
        <p className="text-xs font-semibold tracking-wide text-flirty-pink">{card.compatibility.score}% FLIRTY MATCH</p>
        <h2 className="text-3xl font-bold">
          {card.name}, {card.age} {card.verified ? <span className="text-indigo-300">✓</span> : null}
        </h2>
        <p className="text-sm text-white/70">
          {card.distanceLabel ?? card.city} · {card.intention.toLowerCase()} · {card.vibes[0]}
        </p>
        <p className="mt-3 line-clamp-2 text-sm text-white/80">{card.bio}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {card.interests.slice(0, 4).map((i) => (
            <span key={i} className="rounded-full bg-white/10 px-2 py-1 text-xs">
              {i}
            </span>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-5 gap-1 text-[10px] text-white/60">
          <span>❤️ {card.compatibility.interests}</span>
          <span>✨ {card.compatibility.vibe}</span>
          <span>🎯 {card.compatibility.intent}</span>
          <span>🌙 {card.compatibility.lifestyle}</span>
          <span>📍 {card.compatibility.distance}</span>
        </div>
        {prompts[0]?.answer ? <p className="mt-3 text-sm italic text-white/70">“{prompts[0].answer}”</p> : null}
      </div>
    </motion.article>
  );
}
