"use client";

import { useCallback, useEffect, useState } from "react";
import { RotateCcw, SlidersHorizontal, Star, X, Heart, Zap, MapPin, ChevronDown } from "lucide-react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useApp } from "@/components/providers/AppProviders";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import { MatchModal } from "@/features/discover/MatchModal";
import { Modal, UpgradeModal } from "@/components/ui/Modal";
import { CircleAction } from "@/components/ui/CircleAction";
import { ProfileSwipeCard } from "@/features/discover/ProfileSwipeCard";
import { useRouter } from "next/navigation";
import { PASSPORT_CITIES } from "@/lib/cities";
import { VIBE_ROOMS } from "@/lib/vibe-rooms";
import type { DiscoverCard, DiscoverFeed } from "@/features/discover/types";

export type { DiscoverCard };

const INTENTIONS = ["CASUAL", "DATING", "RELATIONSHIP", "MARRIAGE", "FIGURING_IT_OUT"];

export function DiscoverDeck() {
  const { toast, refresh, me } = useApp();
  const router = useRouter();
  const [tab, setTab] = useState<"feed" | "picks" | string>("feed");
  const [cards, setCards] = useState<DiscoverCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty] = useState<DiscoverFeed["empty"]>(null);
  const [lockedPicks, setLockedPicks] = useState(false);
  const [passportOpen, setPassportOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [reportFor, setReportFor] = useState<DiscoverCard | null>(null);
  const [expanded, setExpanded] = useState(false);
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
    const data = await api<DiscoverFeed>(`/api/discover${query}`);
    setCards(data.cards);
    setEmpty(data.empty);
    setLockedPicks(Boolean(data.locked));
    setExpanded(false);
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
    load().catch(() => {
      setEmpty({ message: "Back in 3 hours", hours: 3 });
      setLoading(false);
    });
  }, [load]);

  async function saveFilters() {
    setFiltersOpen(false);
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
    setExpanded(false);
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

  async function boost() {
    try {
      await api("/api/subscriptions?action=boost", { method: "POST", body: JSON.stringify({ idempotencyKey: crypto.randomUUID() }) });
      toast("Boost is on");
      await refresh();
    } catch (error) {
      if (error instanceof ApiError) setUpgrade({ title: "Boost", body: error.message, required: "PLUS" });
      else toast("Couldn't boost.");
    }
  }

  const cityLabel = me?.passport?.active ? me.passport.city : me?.profile?.city || "Your city";
  const exploring = tab !== "feed" && tab !== "picks";

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <Skeleton className="h-11 rounded-full" />
        <Skeleton className="min-h-0 flex-1 rounded-[1.35rem]" />
        <Skeleton className="mx-auto h-16 w-64 rounded-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col overflow-hidden">
      <header className="flex shrink-0 items-center gap-1.5 pb-2">
        <button
          type="button"
          className="flex min-w-0 max-w-[30%] items-center gap-1 rounded-full py-1 text-sm text-white/80"
          onClick={() => setPassportOpen(true)}
        >
          <MapPin className="h-4 w-4 shrink-0 text-flirty-pink" />
          <span className="truncate font-medium">{cityLabel}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-white/40" />
        </button>
        <div className="mx-auto flex min-w-0 rounded-full bg-white/10 p-0.5 text-[11px] font-semibold">
          <TabChip active={tab === "feed"} onClick={() => setTab("feed")}>
            For you
          </TabChip>
          <TabChip active={tab === "picks"} onClick={() => setTab("picks")}>
            Picks
          </TabChip>
          <TabChip active={exploring} onClick={() => setExploreOpen(true)}>
            Explore
          </TabChip>
        </div>
        <button
          type="button"
          aria-label="Filters"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white/80"
          onClick={() => setFiltersOpen(true)}
        >
          <SlidersHorizontal className="h-5 w-5" />
        </button>
      </header>

      {me?.boost ? <p className="pb-2 text-center text-[11px] font-semibold uppercase tracking-wide text-amber-200">Boost is on</p> : null}

      {lockedPicks ? (
        <EmptyState
          title="Top Picks is part of Gold"
          body="See the four people FLIRTY thinks you would actually like."
          action={
            <Link href="/pricing" className="rounded-full bg-white/10 px-4 py-2">
              See plans
            </Link>
          }
        />
      ) : !cards.length ? (
        <EmptyState
          title={empty?.message ?? "Back in 3 hours"}
          body="Come back later, or open Top Picks and Likes while the deck refills."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <button className="rounded-full bg-white/10 px-4 py-2" onClick={() => load()}>
                Refresh
              </button>
              <Link href="/app/likes" className="rounded-full bg-white/10 px-4 py-2">
                Likes
              </Link>
              <button className="rounded-full bg-white/10 px-4 py-2" onClick={() => setTab("picks")}>
                Top Picks
              </button>
            </div>
          }
        />
      ) : exploring ? (
        <ul className="grid grid-cols-2 gap-2 overflow-y-auto pb-4">
          {cards.map((card) => (
            <li key={card.userId}>
              <Link href={`/app/u/${card.userId}`} className="relative block aspect-[3/4] overflow-hidden rounded-2xl bg-white/5">
                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${card.photos[0]?.src ?? ""})` }} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-2.5">
                  <p className="truncate font-semibold">
                    {card.name}, {card.age}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <>
          <div className="relative min-h-0 flex-1">
            {cards.slice(0, expanded ? 1 : 3).map((card, index) => (
              <ProfileSwipeCard
                key={card.userId}
                card={card}
                index={index}
                active={index === 0}
                expanded={expanded && index === 0}
                onToggleExpand={() => setExpanded((v) => !v)}
                onLike={(focus) => act("LIKE", card.userId, focus)}
                onPass={() => act("PASS", card.userId)}
                onReport={() => setReportFor(card)}
              />
            ))}
          </div>
          <div className="relative z-20 flex shrink-0 items-center justify-center gap-3 py-3">
            <CircleAction label="Rewind" tone="rewind" size="sm" onClick={rewind}>
              <RotateCcw className="h-5 w-5" />
            </CircleAction>
            <CircleAction label="Pass" tone="pass" size="lg" onClick={() => cards[0] && act("PASS", cards[0].userId)}>
              <X className="h-7 w-7" strokeWidth={2.6} />
            </CircleAction>
            <CircleAction label="Super Like" tone="super" size="sm" onClick={() => cards[0] && act("SUPER_LIKE", cards[0].userId)}>
              <Star className="h-5 w-5 fill-current" />
            </CircleAction>
            <CircleAction label="Like" tone="like" size="lg" onClick={() => cards[0] && act("LIKE", cards[0].userId)}>
              <Heart className="h-7 w-7 fill-current" />
            </CircleAction>
            <CircleAction label="Boost" tone="boost" size="sm" onClick={boost}>
              <Zap className="h-5 w-5 fill-current" />
            </CircleAction>
          </div>
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
          <button
            type="button"
            className="rounded-2xl bg-white/5 px-4 py-3 text-left"
            onClick={() =>
              api("/api/subscriptions?action=passport", { method: "POST", body: JSON.stringify({ clear: true }) }).then(() => {
                setPassportOpen(false);
                void load();
              })
            }
          >
            Use my city
          </button>
          {PASSPORT_CITIES.map((row) => (
            <button key={row.city} type="button" className="rounded-2xl bg-white/5 px-4 py-3 text-left" onClick={() => setCity(row.city)}>
              {row.city}, {row.country}
            </button>
          ))}
        </div>
      </Modal>
      <Modal open={exploreOpen} onClose={() => setExploreOpen(false)} title="Explore">
        <div className="grid gap-2">
          {VIBE_ROOMS.map((room) => (
            <button
              key={room.id}
              type="button"
              className={`rounded-2xl px-4 py-3 text-left ${tab === room.id ? "bg-white text-black" : "bg-white/5"}`}
              onClick={() => {
                setTab(room.id);
                setExploreOpen(false);
              }}
            >
              {room.label}
            </button>
          ))}
        </div>
      </Modal>
      <Modal open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters">
        <div className="space-y-5 text-sm">
          <label className="block">
            <div className="flex items-center justify-between">
              <span className="font-medium">Age</span>
              <span className="text-white/60">
                {minAge}–{maxAge}
              </span>
            </div>
            <input type="range" min={18} max={99} value={minAge} onChange={(e) => setMinAge(Number(e.target.value))} className="mt-2 w-full" />
            <input type="range" min={18} max={99} value={maxAge} onChange={(e) => setMaxAge(Number(e.target.value))} className="w-full" />
          </label>
          <label className="block">
            <div className="flex items-center justify-between">
              <span className="font-medium">Distance</span>
              <span className="text-white/60">{distance} km</span>
            </div>
            <input type="range" min={1} max={500} value={distance} onChange={(e) => setDistance(Number(e.target.value))} className="mt-2 w-full" />
          </label>
          <ToggleRow label="Verified only" checked={verifiedOnly} onChange={setVerifiedOnly} />
          <ToggleRow label="Active today" checked={recent} onChange={setRecent} />
          <ToggleRow label="Slow Discover" checked={slow} onChange={setSlow} />
          <div className="flex flex-wrap gap-2">
            {INTENTIONS.map((item) => (
              <button
                key={item}
                type="button"
                className={`rounded-full px-3 py-1.5 ${intentions.includes(item) ? "bg-white text-black" : "bg-white/10"}`}
                onClick={() => setIntentions((list) => (list.includes(item) ? list.filter((v) => v !== item) : [...list, item]))}
              >
                {item.replaceAll("_", " ")}
              </button>
            ))}
          </div>
          <button type="button" className="w-full rounded-full bg-flirty-pink py-3 font-semibold" onClick={() => saveFilters()}>
            Apply
          </button>
        </div>
      </Modal>
      <Modal open={Boolean(reportFor)} onClose={() => setReportFor(null)} title="Report">
        <p className="text-sm text-white/70">Report this profile. We review it privately.</p>
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
          Report
        </button>
      </Modal>
    </div>
  );
}

function TabChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-full px-3 py-1.5 ${active ? "bg-white text-black" : "text-white/55"}`}>
      {children}
    </button>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between">
      <span className="font-medium">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}
