"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { RotateCcw, Star, X } from "lucide-react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useApp } from "@/components/providers/AppProviders";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import { MatchModal } from "@/features/discover/MatchModal";
import { Modal, UpgradeModal } from "@/components/ui/Modal";
import { useRouter } from "next/navigation";
import { motionTokens } from "@/lib/motion";
import { formatIntention } from "@/lib/format";
import { PASSPORT_CITIES } from "@/lib/cities";
import { VIBE_ROOMS } from "@/lib/vibe-rooms";

export type DiscoverCard = {
  userId: string;
  name: string;
  age: number;
  verified: boolean;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  city: string;
  distanceLabel: string | null;
  intention: string;
  bio: string;
  bioEn?: string;
  prompts: { question: string; answer: string }[];
  interests: string[];
  vibes: string[];
  photos: { id: string; src: string; thumb: string }[];
  compatibility: { score: number; interests: number; vibe: number; intent: number; lifestyle: number; distance: number; overall?: number };
  reasons?: string[];
  chips?: string[];
  availability?: string;
  dailyVibe?: { question: string; answer: string } | null;
  voiceIntro?: { src: string; durationMs: number } | null;
  secondChance?: boolean;
  icebreakers?: string[];
};

type Feed = {
  cards: DiscoverCard[];
  empty: { message: string; hours: number } | null;
  passport: { city: string; country: string; active: boolean } | null;
  filters?: {
    minAge: number;
    maxAge: number;
    maxDistanceKm: number;
    verifiedOnly: boolean;
    recentlyActive: boolean;
    intentions: string[];
  };
  locked?: boolean;
};

const INTENTIONS = ["CASUAL", "DATING", "RELATIONSHIP", "MARRIAGE", "FIGURING_IT_OUT"];

export function DiscoverDeck() {
  const { toast, refresh, me } = useApp();
  const router = useRouter();
  const [tab, setTab] = useState<"feed" | "picks" | string>("feed");
  const [cards, setCards] = useState<DiscoverCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty] = useState<Feed["empty"]>(null);
  const [lockedPicks, setLockedPicks] = useState(false);
  const [passportOpen, setPassportOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [reportFor, setReportFor] = useState<DiscoverCard | null>(null);
  const [minAge, setMinAge] = useState(me?.preference?.minAge ?? 21);
  const [maxAge, setMaxAge] = useState(me?.preference?.maxAge ?? 40);
  const [distance, setDistance] = useState(me?.preference?.maxDistanceKm ?? 50);
  const [verifiedOnly, setVerifiedOnly] = useState(Boolean(me?.preference?.verifiedOnly));
  const [recent, setRecent] = useState(Boolean(me?.preference?.recentlyActive));
  const [intentions, setIntentions] = useState<string[]>(me?.preference?.intentions ?? []);
  const [slow, setSlow] = useState(Boolean(me?.profile?.slowDiscover));
  const [match, setMatch] = useState<{
    name: string;
    score: number;
    photo?: string;
    conversationId?: string | null;
    myPhoto?: string;
    icebreakers?: string[];
    breakdown?: DiscoverCard["compatibility"];
    opener?: string;
  } | null>(null);
  const [upgrade, setUpgrade] = useState<{ title: string; body: string; required: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const query = tab === "picks" ? "?top=1" : tab !== "feed" ? `?room=${tab}` : "";
    const data = await api<Feed>(`/api/discover${query}`);
    setCards(data.cards);
    setEmpty(data.empty);
    setLockedPicks(Boolean(data.locked));
    if (data.filters) {
      setMinAge(data.filters.minAge);
      setMaxAge(data.filters.maxAge);
      setDistance(data.filters.maxDistanceKm);
      setVerifiedOnly(data.filters.verifiedOnly);
      setRecent(data.filters.recentlyActive);
      setIntentions(data.filters.intentions);
    }
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    setLoading(true);
    load().catch(() => setLoading(false));
  }, [load]);

  async function saveFilters() {
    await api("/api/profiles", {
      method: "PATCH",
      body: JSON.stringify({
        minAge,
        maxAge,
        maxDistanceKm: distance,
        verifiedOnly,
        recentlyActive: recent,
        intentions,
        slowDiscover: slow,
      }),
    });
    setFiltersOpen(false);
    await load();
    void refresh();
  }

  async function setCity(city: string) {
    try {
      await api("/api/subscriptions?action=passport", { method: "POST", body: JSON.stringify({ city }) });
      toast(`Discovering in ${city}`);
      setPassportOpen(false);
      await load();
      void refresh();
    } catch (error) {
      toast(error instanceof ApiError ? error.message : "Passport needs Plus.");
    }
  }

  async function act(
    kind: "PASS" | "SUPER_LIKE" | "LIKE",
    targetId: string,
    focus?: { focusType?: "photo" | "prompt" | "vibe"; focusLabel?: string; photoId?: string },
  ) {
    if (busy) return;
    setBusy(true);
    const leaving = cards[0];
    setCards((list) => list.slice(1));
    try {
      const result = await api<{
        match: {
          compatibility?: number;
          conversationId?: string;
          icebreakers?: string[];
          breakdown?: DiscoverCard["compatibility"];
        } | null;
      }>("/api/flirts", {
        method: "POST",
        body: JSON.stringify({ targetId, kind, idempotencyKey: crypto.randomUUID(), ...focus }),
      });
      if (kind === "LIKE") toast(focus?.focusLabel ? `Liked “${focus.focusLabel}”` : "Liked ❤️");
      if (kind === "SUPER_LIKE") toast("Super Like sent 💫");
      if (result.match && leaving) {
        setMatch({
          name: leaving.name,
          score: result.match.compatibility ?? leaving.compatibility.score,
          photo: leaving.photos[0]?.src,
          conversationId: result.match.conversationId,
          myPhoto: me?.profile?.photos[0]?.src,
          icebreakers: result.match.icebreakers ?? leaving.icebreakers,
          breakdown: result.match.breakdown ?? leaving.compatibility,
        });
      }
      void refresh();
      if (cards.length < 4 && tab === "feed") void load();
    } catch (error) {
      if (leaving) setCards((list) => [leaving, ...list]);
      if (error instanceof ApiError && (error.code === "UPGRADE_REQUIRED" || error.code === "LIMIT_REACHED")) {
        setUpgrade({
          title: "You found someone worth sending.",
          body: error.message,
          required: me?.entitlements.plan === "FREE" ? "PLUS" : "GOLD",
        });
      } else {
        toast("Couldn't send that. Try again.");
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

  const cityLabel = me?.passport?.active ? me.passport.city : me?.profile?.city || "Your city";

  if (loading) {
    return (
      <div className="mx-auto max-w-md space-y-4">
        <Skeleton className="h-10 rounded-full" />
        <Skeleton className="h-[560px] rounded-[2rem]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-3 flex items-center gap-2">
        <button type="button" className="rounded-full bg-white/10 px-3 py-1.5 text-sm" onClick={() => setPassportOpen(true)}>
          {cityLabel}
        </button>
        <button type="button" className="rounded-full bg-white/10 px-3 py-1.5 text-sm" onClick={() => setFiltersOpen(true)}>
          Filters
        </button>
        {slow ? <span className="rounded-full bg-indigo-500/30 px-3 py-1.5 text-xs">Slow Discover</span> : null}
      </div>
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1 text-xs">
        <TabChip active={tab === "feed"} onClick={() => setTab("feed")}>For you</TabChip>
        <TabChip active={tab === "picks"} onClick={() => setTab("picks")}>Top Picks</TabChip>
        {VIBE_ROOMS.map((room) => (
          <TabChip key={room.id} active={tab === room.id} onClick={() => setTab(room.id)}>
            {room.label}
          </TabChip>
        ))}
      </div>

      {lockedPicks ? (
        <EmptyState
          title="Top Picks is part of Gold"
          body="See the four people FLIRTY thinks you would actually like."
          action={<Link href="/pricing" className="rounded-full bg-white/10 px-4 py-2">See plans</Link>}
        />
      ) : !cards.length ? (
        <EmptyState
          title={empty?.message ?? "Back in 3 hours"}
          body="Come back later, or open Top Picks and Likes while the deck refills."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <button className="rounded-full bg-white/10 px-4 py-2" onClick={() => load()}>Refresh</button>
              <Link href="/app/likes" className="rounded-full bg-white/10 px-4 py-2">Likes</Link>
              <button className="rounded-full bg-white/10 px-4 py-2" onClick={() => setTab("picks")}>Top Picks</button>
            </div>
          }
        />
      ) : tab !== "feed" && tab !== "picks" ? (
        <ul className="space-y-3">
          {cards.map((card) => (
            <li key={card.userId}>
              <Link href={`/app/u/${card.userId}`} className="flex gap-3 rounded-[1.6rem] bg-white/5 p-3">
                <div className="h-20 w-16 rounded-2xl bg-cover bg-center" style={{ backgroundImage: `url(${card.photos[0]?.src ?? ""})` }} />
                <div className="min-w-0">
                  <p className="font-semibold">{card.name}, {card.age}</p>
                  <p className="text-xs text-flirty-pink">{card.compatibility.score}% overall</p>
                  <p className="truncate text-sm text-white/60">{card.vibes[0] ?? card.city}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <>
          <div className="relative h-[min(72dvh,620px)]">
            {cards.slice(0, 3).map((card, index) => (
              <ProfileSwipeCard
                key={card.userId}
                card={card}
                index={index}
                active={index === 0}
                onLike={(focus) => act("LIKE", card.userId, focus)}
                onPass={() => act("PASS", card.userId)}
                onOpen={() => router.push(`/app/u/${card.userId}`)}
                onReport={() => setReportFor(card)}
              />
            ))}
          </div>
          {tab === "feed" ? (
            <div className="mt-5 flex items-center justify-center gap-4">
              <button aria-label="Rewind" className="grid h-12 w-12 place-items-center rounded-full bg-white/10" onClick={rewind}>
                <RotateCcw className="h-5 w-5" />
              </button>
              <button aria-label="Pass" className="grid h-14 w-14 place-items-center rounded-full bg-white/10" onClick={() => cards[0] && act("PASS", cards[0].userId)}>
                <X className="h-6 w-6" />
              </button>
              <motion.button
                aria-label="Like"
                whileTap={{ scale: 0.9 }}
                className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-flirty-pink to-indigo-500 text-xl shadow-glow"
                onClick={() => cards[0] && act("LIKE", cards[0].userId)}
              >
                ♥
              </motion.button>
              <button aria-label="Super Like" className="grid h-14 w-14 place-items-center rounded-full bg-indigo-500/30 text-indigo-200" onClick={() => cards[0] && act("SUPER_LIKE", cards[0].userId)}>
                <Star className="h-6 w-6" />
              </button>
            </div>
          ) : null}
        </>
      )}

      <MatchModal
        open={Boolean(match)}
        name={match?.name ?? ""}
        score={match?.score ?? 0}
        photo={match?.photo}
        myPhoto={match?.myPhoto}
        icebreakers={match?.icebreakers}
        breakdown={match?.breakdown}
        onKeep={() => setMatch(null)}
        onMessage={() => {
          const id = match?.conversationId;
          const line = match?.opener;
          setMatch(null);
          if (line) sessionStorage.setItem("flirty.opener", line);
          router.push(id ? `/app/chat/${id}` : "/app/chat");
        }}
        onUseLine={(line) => {
          sessionStorage.setItem("flirty.opener", line);
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
      <Modal open={passportOpen} onClose={() => setPassportOpen(false)} title="Passport">
        <p className="text-sm text-white/60">Discover people in another city. This is not live location sharing.</p>
        <div className="mt-3 grid max-h-72 gap-2 overflow-y-auto">
          <button type="button" className="rounded-2xl bg-white/5 px-4 py-3 text-left" onClick={() => api("/api/subscriptions?action=passport", { method: "POST", body: JSON.stringify({ clear: true }) }).then(() => { setPassportOpen(false); void load(); })}>
            Use my city
          </button>
          {PASSPORT_CITIES.map((row) => (
            <button key={row.city} type="button" className="rounded-2xl bg-white/5 px-4 py-3 text-left" onClick={() => setCity(row.city)}>
              {row.city}, {row.country}
            </button>
          ))}
        </div>
      </Modal>
      <Modal open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Discover filters">
        <div className="space-y-4 text-sm">
          <label className="block">Age {minAge}–{maxAge}
            <input type="range" min={18} max={99} value={minAge} onChange={(e) => setMinAge(Number(e.target.value))} className="mt-2 w-full" />
            <input type="range" min={18} max={99} value={maxAge} onChange={(e) => setMaxAge(Number(e.target.value))} className="w-full" />
          </label>
          <label className="block">Distance {distance} km
            <input type="range" min={1} max={500} value={distance} onChange={(e) => setDistance(Number(e.target.value))} className="mt-2 w-full" />
          </label>
          <label className="flex items-center justify-between">Verified only <input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} /></label>
          <label className="flex items-center justify-between">Active today <input type="checkbox" checked={recent} onChange={(e) => setRecent(e.target.checked)} /></label>
          <label className="flex items-center justify-between">Slow Discover <input type="checkbox" checked={slow} onChange={(e) => setSlow(e.target.checked)} /></label>
          <div className="flex flex-wrap gap-2">
            {INTENTIONS.map((item) => (
              <button key={item} type="button" className={`rounded-full px-3 py-1 ${intentions.includes(item) ? "bg-white text-black" : "bg-white/10"}`} onClick={() => setIntentions((list) => list.includes(item) ? list.filter((v) => v !== item) : [...list, item])}>
                {item.replaceAll("_", " ")}
              </button>
            ))}
          </div>
          <button type="button" className="w-full rounded-full bg-flirty-pink py-3" onClick={() => saveFilters()}>Apply</button>
        </div>
      </Modal>
      <Modal open={Boolean(reportFor)} onClose={() => setReportFor(null)} title="Report photo">
        <p className="text-sm text-white/70">Report this photo from the card. We review it privately.</p>
        <button
          type="button"
          className="mt-4 w-full rounded-full bg-flirty-pink py-3"
          onClick={async () => {
            if (!reportFor) return;
            await api("/api/safety", { method: "POST", body: JSON.stringify({ reportedId: reportFor.userId, category: "INAPPROPRIATE", details: "Photo reported from Discover card" }) });
            toast("Report sent");
            setReportFor(null);
          }}
        >
          Report photo
        </button>
      </Modal>
      {me?.boost ? <p className="mt-4 text-center text-xs text-amber-200">BOOST ACTIVE</p> : null}
      {me?.spotlight ? <p className="mt-1 text-center text-xs text-indigo-200">SPOTLIGHT ACTIVE</p> : null}
    </div>
  );
}

function TabChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`shrink-0 rounded-full px-3 py-1.5 ${active ? "bg-white text-black" : "bg-white/10"}`}>
      {children}
    </button>
  );
}

function ProfileSwipeCard({
  card,
  index,
  active,
  onLike,
  onPass,
  onOpen,
  onReport,
}: {
  card: DiscoverCard;
  index: number;
  active: boolean;
  onLike: (focus?: { focusType?: "photo" | "prompt" | "vibe"; focusLabel?: string; photoId?: string }) => void;
  onPass: () => void;
  onOpen: () => void;
  onReport: () => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-10, 10]);
  const likeOp = useTransform(x, [40, 140], [0, 1]);
  const passOp = useTransform(x, [-140, -40], [1, 0]);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [showWhy, setShowWhy] = useState(false);
  const photos = card.photos.length ? card.photos : [{ id: "fallback", src: "/avatars/fallback.svg", thumb: "/avatars/fallback.svg" }];
  const photo = photos[Math.min(photoIndex, photos.length - 1)]!;
  const prompt = card.prompts[Math.min(photoIndex, Math.max(0, card.prompts.length - 1))];

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
        if (info.offset.x > 120 || info.velocity.x > 700) onLike();
        else if (info.offset.x < -120 || info.velocity.x < -700) onPass();
      }}
    >
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${photo.src})` }} />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
      <div className="absolute inset-x-0 top-0 z-10 flex h-24">
        <button type="button" className="flex-1" aria-label="Previous photo" onClick={() => setPhotoIndex((i) => Math.max(0, i - 1))} />
        <button type="button" className="flex-1" aria-label="Next photo" onClick={() => setPhotoIndex((i) => Math.min(photos.length - 1, i + 1))} />
      </div>
      <div className="absolute inset-x-3 top-3 z-10 flex gap-1">
        {photos.map((item, i) => (
          <span key={item.id} className={`h-1 flex-1 rounded-full ${i === photoIndex ? "bg-white" : "bg-white/30"}`} />
        ))}
      </div>
      <motion.div style={{ opacity: likeOp }} className="pointer-events-none absolute left-5 top-8 rounded-full border-2 border-flirty-pink px-3 py-1 text-sm font-bold text-flirty-pink">
        LIKE
      </motion.div>
      <motion.div style={{ opacity: passOp }} className="pointer-events-none absolute right-5 top-8 rounded-full border-2 border-white/50 px-3 py-1 text-sm font-bold">
        PASS
      </motion.div>
      <div className="absolute inset-x-0 bottom-0 p-5">
        {card.secondChance ? <p className="mb-2 text-xs font-semibold text-amber-200">Second chance</p> : null}
        <button type="button" className="text-xs font-semibold tracking-wide text-flirty-pink" onClick={() => setShowWhy((v) => !v)}>
          {card.compatibility.score}% overall
        </button>
        {showWhy ? (
          <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-white/70">
            <p>Interests {card.compatibility.interests}%</p>
            <p>Vibe {card.compatibility.vibe}%</p>
            <p>Intention {card.compatibility.intent}%</p>
            <p>Lifestyle {card.compatibility.lifestyle}%</p>
          </div>
        ) : null}
        <h2 className="text-3xl font-bold">
          {card.name}, {card.age} {card.verified ? <span className="text-indigo-300">✓</span> : null}
        </h2>
        <p className="text-xs text-white/50">
          {card.verified ? "Selfie verified" : "Not selfie verified"}
          {card.emailVerified ? " · Email" : ""}
          {card.phoneVerified ? " · Phone" : ""}
        </p>
        <p className="text-sm text-white/70">
          {card.distanceLabel ?? card.city} · {formatIntention(card.intention)}
          {card.availability ? ` · ${card.availability}` : ""}
        </p>
        {prompt ? (
          <button
            type="button"
            className="mt-3 w-full rounded-2xl bg-black/40 p-3 text-left"
            onClick={() => onLike({ focusType: "prompt", focusLabel: prompt.answer })}
          >
            <p className="text-[11px] uppercase tracking-wide text-white/55">{prompt.question}</p>
            <p className="mt-1 text-base font-semibold">{prompt.answer}</p>
            <p className="mt-1 text-[11px] text-flirty-pink">Like this prompt</p>
          </button>
        ) : (
          <p className="mt-3 line-clamp-2 text-sm text-white/80">{card.bio}</p>
        )}
        {card.dailyVibe ? (
          <p className="mt-2 rounded-2xl bg-indigo-500/20 px-3 py-2 text-xs">Today: {card.dailyVibe.answer}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          {card.vibes.slice(0, 3).map((vibe) => (
            <button key={vibe} type="button" className="rounded-full bg-indigo-500/30 px-2 py-1 text-xs" onClick={() => onLike({ focusType: "vibe", focusLabel: vibe })}>
              {vibe}
            </button>
          ))}
          {card.chips?.slice(0, 4).map((chip) => (
            <span key={chip} className="rounded-full bg-white/10 px-2 py-1 text-xs">{chip}</span>
          ))}
        </div>
        {card.voiceIntro ? <audio className="mt-3 w-full" controls src={card.voiceIntro.src} /> : null}
        <div className="mt-3 flex gap-2">
          <button type="button" className="rounded-full bg-white/10 px-3 py-1 text-xs" onClick={onOpen}>View profile</button>
          <button type="button" className="rounded-full bg-white/10 px-3 py-1 text-xs" onClick={() => onLike({ focusType: "photo", focusLabel: "this photo", photoId: photo.id !== "fallback" ? photo.id : undefined })}>Like photo</button>
          <button type="button" className="rounded-full bg-white/10 px-3 py-1 text-xs text-rose-200" onClick={onReport}>Report photo</button>
        </div>
      </div>
    </motion.article>
  );
}
