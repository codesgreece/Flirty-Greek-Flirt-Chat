"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/providers/AppProviders";
import { FlirtyButton } from "@/components/ui/FlirtyButton";
import { api } from "@/lib/api";
import { ImageViewer } from "@/components/media/ImageViewer";
import { formatIntention } from "@/lib/format";

export default function ProfilePage() {
  const { me, toast, refresh } = useApp();
  const router = useRouter();
  const [viewer, setViewer] = useState<number | null>(null);
  if (!me?.profile) return null;
  const photos = me.profile.photos ?? [];
  return (
    <section className="mx-auto max-w-lg space-y-6 pb-8">
      <button type="button" className="overflow-hidden rounded-[2rem] bg-white/5 text-left" onClick={() => photos[0] && setViewer(0)}>
        <div
          className="h-80 bg-gradient-to-br from-pink-500/40 to-indigo-700/50 bg-cover bg-center"
          style={{ backgroundImage: photos[0] ? `url(${photos[0].src})` : undefined }}
        />
      </button>
      <div>
        <p className="text-3xl font-bold">
          {me.profile.name}, {me.profile.age}         {me.profile.verified ? <span className="text-indigo-300">✓</span> : null}
        </p>
        <p className="text-xs text-white/45">
          {me.profile.verified ? "Selfie verified" : "Not selfie verified"}
          {me.profile.emailVerified ? " · Email verified" : ""}
          {me.profile.phoneVerified ? " · Phone verified" : ""}
        </p>
        <p className="text-sm text-white/60">
          {me.profile.city} · {me.entitlements.plan}
        </p>
      </div>
      <Link href="/app/profile/edit" className="block">
        <FlirtyButton type="button" className="w-full">
          Edit Profile
        </FlirtyButton>
      </Link>
      {me.profile.bio ? (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white/45">Bio</h2>
          <p className="mt-2 text-white/80">{me.profile.bio}</p>
          {me.profile.bioEn ? <p className="mt-2 text-sm text-white/60">{me.profile.bioEn}</p> : null}
        </section>
      ) : null}
      {me.profile.chips?.length ? (
        <div className="flex flex-wrap gap-2">
          {me.profile.chips.map((chip) => (
            <span key={chip} className="rounded-full bg-white/10 px-3 py-1 text-xs">{chip}</span>
          ))}
        </div>
      ) : null}
      {me.profile.voiceIntro ? <audio className="w-full" controls src={me.profile.voiceIntro.src} /> : null}
      {me.profile.interests.length ? (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white/45">Interests</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {me.profile.interests.map((v) => (
              <span key={v} className="rounded-full bg-white/10 px-3 py-1 text-xs">{v}</span>
            ))}
          </div>
        </section>
      ) : null}
      {me.profile.vibes.length ? (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white/45">My Vibe</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {me.profile.vibes.map((v) => (
              <span key={v} className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs">{v}</span>
            ))}
            {(me.profile.lifestyle?.extras ?? "").split(",").filter(Boolean).map((v) => (
              <span key={v} className="rounded-full bg-white/10 px-3 py-1 text-xs">{v.trim()}</span>
            ))}
          </div>
        </section>
      ) : null}
      <section className="space-y-1 text-sm text-white/70">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-white/45">About me</h2>
        {me.profile.jobTitle ? <p>Job · {me.profile.jobTitle}</p> : null}
        {me.profile.education ? <p>Education · {me.profile.education}</p> : null}
        <p>Looking for · {formatIntention(me.profile.intention)}</p>
        {me.profile.languages?.length ? <p>Languages · {me.profile.languages.join(", ")}</p> : null}
      </section>
      <div className="grid gap-3">
        <Link href="/app/profile/edit#preferences" className="rounded-2xl bg-white/5 px-4 py-4">Preferences</Link>
        <Link href="/app/settings" className="rounded-2xl bg-white/5 px-4 py-4">Account Settings</Link>
        <Link href="/app/settings" className="rounded-2xl bg-white/5 px-4 py-4">Privacy & Safety</Link>
        <Link href="/app/settings" className="rounded-2xl bg-white/5 px-4 py-4 text-rose-300">Delete Account</Link>
        <Link href="/app/views" className="rounded-2xl bg-white/5 px-4 py-4">Who viewed you</Link>
        <Link href="/pricing" className="rounded-2xl bg-white/5 px-4 py-4">Subscription & shop</Link>
        {me.isAdmin ? <Link href="/admin" className="rounded-2xl bg-white/5 px-4 py-4">Admin control center</Link> : null}
        <FlirtyButton
          type="button"
          variant="ghost"
          onClick={async () => {
            await api("/api/subscriptions?action=boost", { method: "POST", body: JSON.stringify({ idempotencyKey: crypto.randomUUID() }) }).catch((e) => toast(e.message));
            await refresh();
            toast("Boost requested");
          }}
        >
          Activate Boost
        </FlirtyButton>
        <FlirtyButton
          type="button"
          variant="ghost"
          onClick={async () => {
            await api("/api/auth?action=logout", { method: "POST", body: "{}" });
            router.push("/");
          }}
        >
          Log out
        </FlirtyButton>
      </div>
      {viewer != null ? (
        <ImageViewer photos={photos.map((p) => ({ src: p.src }))} index={viewer} onClose={() => setViewer(null)} />
      ) : null}
    </section>
  );
}
