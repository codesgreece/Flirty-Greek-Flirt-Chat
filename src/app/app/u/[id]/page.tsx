"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, ChevronLeft, Heart, MapPin, MessageCircle, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useApp } from "@/components/providers/AppProviders";
import { UpgradeModal } from "@/components/ui/Modal";
import { ImageViewer } from "@/components/media/ImageViewer";
import { CircleAction } from "@/components/ui/CircleAction";
import { formatIntention } from "@/lib/format";

type PublicProfile = {
  userId: string;
  name: string;
  age: number;
  verified: boolean;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  bio: string;
  bioEn?: string;
  city: string;
  jobTitle: string;
  education: string;
  languages: string[];
  chips?: string[];
  availability?: string;
  dailyVibe?: { question: string; answer: string } | null;
  voiceIntro?: { src: string; durationMs: number } | null;
  intention: string;
  interests: string[];
  vibes: string[];
  photos: { id: string; src: string }[];
  compatibility: { score: number; interests?: number; vibe?: number; intent?: number };
  liked: boolean;
  matched: boolean;
  conversationId: string | null;
  canFirstMessage: boolean;
  mine: boolean;
};

export default function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { toast, refresh, me } = useApp();
  const router = useRouter();
  const [id, setId] = useState("");
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [upgrade, setUpgrade] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [viewer, setViewer] = useState<number | null>(null);

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  useEffect(() => {
    if (!id) return;
    if (id === me?.id) {
      router.replace("/app/profile");
      return;
    }
    api<PublicProfile>(`/api/profiles?userId=${id}`).then(setProfile).catch(() => toast("Profile unavailable."));
  }, [id, me?.id, router, toast]);

  async function like() {
    if (!profile) return;
    try {
      const result = await api<{ match: { conversationId?: string } | null }>("/api/flirts", {
        method: "POST",
        body: JSON.stringify({ targetId: profile.userId, kind: "LIKE", idempotencyKey: crypto.randomUUID() }),
      });
      toast("Liked ❤️");
      if (result.match?.conversationId) router.push(`/app/chat/${result.match.conversationId}`);
      else setProfile({ ...profile, liked: true, matched: Boolean(result.match), conversationId: result.match?.conversationId ?? profile.conversationId });
      void refresh();
    } catch (error) {
      toast(error instanceof ApiError ? error.message : "Couldn't like.");
    }
  }

  async function pass() {
    if (!profile) return;
    try {
      await api("/api/flirts", {
        method: "POST",
        body: JSON.stringify({ targetId: profile.userId, kind: "PASS", idempotencyKey: crypto.randomUUID() }),
      });
      router.back();
    } catch {
      router.back();
    }
  }

  async function sendMessage() {
    if (!profile) return;
    if (profile.conversationId) {
      router.push(`/app/chat/${profile.conversationId}`);
      return;
    }
    if (!profile.canFirstMessage) {
      setUpgrade("First Message before a match is part of Platinum.");
      return;
    }
    const body = message.trim();
    if (!body) {
      toast("Write a first message.");
      return;
    }
    try {
      const result = await api<{ conversationId?: string }>("/api/chat?type=dm", {
        method: "POST",
        body: JSON.stringify({ recipientId: profile.userId, body, idempotencyKey: crypto.randomUUID() }),
      });
      toast("Message sent");
      if (result.conversationId) router.push(`/app/chat/${result.conversationId}`);
    } catch (error) {
      if (error instanceof ApiError && error.code === "ALREADY_MATCHED") {
        const extra = (error as ApiError & { extra?: { conversationId?: string } }).extra;
        router.push(extra?.conversationId ? `/app/chat/${extra.conversationId}` : "/app/chat");
        return;
      }
      if (error instanceof ApiError && (error.code === "UPGRADE_REQUIRED" || error.code === "LIMIT_REACHED")) {
        setUpgrade(error.message);
        return;
      }
      toast(error instanceof ApiError ? error.message : "Couldn't send.");
    }
  }

  if (!profile) return <p className="p-6 text-white/50">Loading profile…</p>;

  return (
    <section className="mx-auto max-w-lg pb-28" style={{ paddingTop: "max(0.75rem, var(--safe-top))" }}>
      <button type="button" onClick={() => router.back()} className="mb-3 grid h-9 w-9 place-items-center rounded-full bg-white/10" aria-label="Back">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button type="button" className="relative w-full overflow-hidden rounded-[1.35rem]" onClick={() => setViewer(0)}>
        <div className="aspect-[3/4] bg-cover bg-center" style={{ backgroundImage: profile.photos[0] ? `url(${profile.photos[0].src})` : undefined }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5 text-left">
          <p className="flex items-center gap-1.5 text-3xl font-extrabold">
            {profile.name}, {profile.age}
            {profile.verified ? <BadgeCheck className="h-6 w-6 text-sky-400" /> : null}
          </p>
          <p className="mt-1 flex items-center gap-1 text-sm text-white/75">
            <MapPin className="h-3.5 w-3.5" />
            {profile.city}
          </p>
        </div>
      </button>

      <div className="space-y-5 px-1 pt-5">
        {profile.jobTitle || profile.education ? (
          <p className="text-sm text-white/70">
            {[profile.jobTitle, profile.education].filter(Boolean).join(" · ")}
          </p>
        ) : null}
        <p className="text-sm text-white/55">Looking for {formatIntention(profile.intention)}</p>
        {profile.bio ? <p className="text-[15px] leading-relaxed text-white/85">{profile.bio}</p> : null}
        {profile.dailyVibe ? <p className="rounded-2xl bg-white/5 px-4 py-3 text-sm">Today: {profile.dailyVibe.answer}</p> : null}
        {profile.voiceIntro ? <audio className="w-full" controls src={profile.voiceIntro.src} /> : null}
        {profile.photos.slice(1).map((photo, index) => (
          <button key={photo.id} type="button" className="block w-full overflow-hidden rounded-2xl" onClick={() => setViewer(index + 1)}>
            <div className="aspect-[3/4] bg-cover bg-center" style={{ backgroundImage: `url(${photo.src})` }} />
          </button>
        ))}
        <div className="flex flex-wrap gap-2">
          {profile.chips?.map((chip) => (
            <span key={chip} className="rounded-full bg-white/10 px-3 py-1.5 text-sm">{chip}</span>
          ))}
          {profile.interests.map((i) => (
            <span key={i} className="rounded-full bg-white/10 px-3 py-1.5 text-sm">{i}</span>
          ))}
          {profile.vibes.map((v) => (
            <span key={v} className="rounded-full bg-indigo-500/20 px-3 py-1.5 text-sm">{v}</span>
          ))}
        </div>
        {!profile.matched && profile.canFirstMessage ? (
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={280}
            placeholder="Write a first message…"
            className="h-24 w-full rounded-2xl bg-white/5 px-4 py-3 text-sm"
          />
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-center gap-5 bg-gradient-to-t from-black via-black/90 to-transparent px-6 pb-[calc(1rem+var(--safe-bottom))] pt-8 md:static md:bg-none md:px-0 md:pb-0 md:pt-6">
        <CircleAction label="Pass" tone="pass" size="md" onClick={pass}>
          <X className="h-6 w-6" strokeWidth={2.6} />
        </CircleAction>
        <CircleAction label="Message" tone="super" size="sm" onClick={sendMessage}>
          <MessageCircle className="h-5 w-5" />
        </CircleAction>
        <CircleAction label="Like" tone="like" size="md" onClick={like} disabled={profile.liked}>
          <Heart className="h-6 w-6 fill-current" />
        </CircleAction>
      </div>

      {viewer != null ? <ImageViewer photos={profile.photos.map((p) => ({ src: p.src }))} index={viewer} onClose={() => setViewer(null)} /> : null}
      <UpgradeModal
        open={Boolean(upgrade)}
        onClose={() => setUpgrade(null)}
        title="Unlock First Message"
        body={upgrade ?? ""}
        required="PLATINUM"
        onUpgrade={() => router.push("/pricing")}
      />
    </section>
  );
}
