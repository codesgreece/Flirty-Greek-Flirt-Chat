"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useApp } from "@/components/providers/AppProviders";
import { FlirtyButton } from "@/components/ui/FlirtyButton";
import { UpgradeModal } from "@/components/ui/Modal";
import { ImageViewer } from "@/components/media/ImageViewer";
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
    <section className="mx-auto max-w-lg space-y-5 px-4 py-4">
      <button type="button" onClick={() => router.back()} className="text-sm text-white/60">
        ← Back
      </button>
      <button type="button" className="w-full overflow-hidden rounded-[2rem]" onClick={() => setViewer(0)}>
        <div className="h-80 bg-cover bg-center" style={{ backgroundImage: profile.photos[0] ? `url(${profile.photos[0].src})` : undefined }} />
      </button>
      <div>
        <p className="text-3xl font-bold">
          {profile.name}, {profile.age} {profile.verified ? <span className="text-indigo-300">✓</span> : null}
        </p>
        <p className="text-sm text-flirty-pink">{profile.compatibility.score}% overall</p>
        {profile.compatibility.interests != null ? (
          <p className="text-xs text-white/50">
            Interests {profile.compatibility.interests}% · Vibe {profile.compatibility.vibe}% · Intention {profile.compatibility.intent}%
          </p>
        ) : null}
        <p className="text-xs text-white/50">
          {profile.verified ? "Selfie verified" : "Not selfie verified"}
          {profile.emailVerified ? " · Email" : ""}
          {profile.phoneVerified ? " · Phone" : ""}
        </p>
        <p className="text-sm text-white/60">{profile.city} · {formatIntention(profile.intention)}{profile.availability ? ` · ${profile.availability}` : ""}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FlirtyButton type="button" onClick={like} disabled={profile.liked}>
          {profile.liked ? "Liked" : "❤️ Like"}
        </FlirtyButton>
        <FlirtyButton type="button" variant="ghost" onClick={sendMessage}>
          💬 Message
        </FlirtyButton>
      </div>
      {!profile.matched && profile.canFirstMessage ? (
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={280}
          placeholder="Write a first message…"
          className="h-24 w-full rounded-2xl bg-white/5 px-4 py-3 text-sm"
        />
      ) : !profile.matched ? (
        <p className="text-xs text-white/50">Like each other to unlock chat, or upgrade to Platinum for a first message.</p>
      ) : null}
      <p className="text-white/80">{profile.bio}</p>
      {profile.bioEn ? <p className="text-sm text-white/60">{profile.bioEn}</p> : null}
      {profile.dailyVibe ? <p className="rounded-2xl bg-indigo-500/20 px-4 py-3 text-sm">Today: {profile.dailyVibe.answer}</p> : null}
      {profile.voiceIntro ? <audio className="w-full" controls src={profile.voiceIntro.src} /> : null}
      <div className="flex flex-wrap gap-2">
        {profile.chips?.map((chip) => (
          <span key={chip} className="rounded-full bg-white/10 px-3 py-1 text-xs">{chip}</span>
        ))}
        {profile.interests.map((i) => (
          <span key={i} className="rounded-full bg-white/10 px-3 py-1 text-xs">{i}</span>
        ))}
        {profile.vibes.map((v) => (
          <span key={v} className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs">{v}</span>
        ))}
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
