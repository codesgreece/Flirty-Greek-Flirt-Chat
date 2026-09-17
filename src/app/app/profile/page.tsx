"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BadgeCheck, ChevronRight, Eye, LogOut, Pencil, Shield, Sparkles, Zap } from "lucide-react";
import { useApp } from "@/components/providers/AppProviders";
import { api } from "@/lib/api";
import { ImageViewer } from "@/components/media/ImageViewer";

export default function ProfilePage() {
  const { me, toast, refresh } = useApp();
  const router = useRouter();
  const [viewer, setViewer] = useState<number | null>(null);
  if (!me?.profile) return null;
  const photos = me.profile.photos ?? [];
  const photo = photos[0]?.src;
  return (
    <section className="mx-auto w-full max-w-md space-y-5 pb-6">
      <button
        type="button"
        className="relative block w-full overflow-hidden rounded-[1.35rem] bg-white/5 text-left"
        onClick={() => photos[0] && setViewer(0)}
      >
        <div
          className="aspect-[3/4] bg-gradient-to-br from-pink-500/40 to-indigo-700/50 bg-cover bg-center"
          style={{ backgroundImage: photo ? `url(${photo})` : undefined }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5">
          <p className="flex items-center gap-1.5 text-3xl font-extrabold">
            {me.profile.name}, {me.profile.age}
            {me.profile.verified ? <BadgeCheck className="h-6 w-6 text-sky-400" /> : null}
          </p>
          <p className="mt-1 text-sm text-white/70">{me.profile.city}</p>
        </div>
      </button>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/app/profile/edit" className="flex items-center justify-center gap-2 rounded-full bg-white/10 py-3 text-sm font-semibold">
          <Pencil className="h-4 w-4" /> Edit
        </Link>
        <Link href="/app/settings" className="flex items-center justify-center gap-2 rounded-full bg-white/10 py-3 text-sm font-semibold">
          <Shield className="h-4 w-4" /> Settings
        </Link>
      </div>

      <Link
        href="/pricing"
        className="block rounded-2xl bg-gradient-to-r from-amber-300/20 to-flirty-pink/20 px-4 py-4"
      >
        <p className="text-xs uppercase tracking-[0.18em] text-amber-200">Subscription</p>
        <p className="mt-1 font-semibold">FLIRTY {me.entitlements.plan}</p>
      </Link>

      <div className="overflow-hidden rounded-2xl bg-white/5">
        <Row href="/app/views" icon={Eye} label="Who viewed you" />
        <Row href="/app/notifications" icon={Sparkles} label="Notifications" />
        <Row href="/pricing" icon={Sparkles} label="Shop & plans" />
        {me.isAdmin ? <Row href="/admin" icon={Shield} label="Admin" /> : null}
      </div>

      <button
        type="button"
        className="flex w-full items-center justify-center gap-2 rounded-full bg-white/10 py-3 text-sm font-semibold"
        onClick={async () => {
          await api("/api/subscriptions?action=boost", { method: "POST", body: JSON.stringify({ idempotencyKey: crypto.randomUUID() }) }).catch((e) => toast(e.message));
          await refresh();
          toast("Boost requested");
        }}
      >
        <Zap className="h-4 w-4 text-violet-300" /> Boost my profile
      </button>
      <button
        type="button"
        className="flex w-full items-center justify-center gap-2 py-2 text-sm text-white/45"
        onClick={async () => {
          await api("/api/auth?action=logout", { method: "POST", body: "{}" });
          router.push("/");
        }}
      >
        <LogOut className="h-4 w-4" /> Log out
      </button>
      {viewer != null ? (
        <ImageViewer photos={photos.map((p) => ({ src: p.src }))} index={viewer} onClose={() => setViewer(null)} />
      ) : null}
    </section>
  );
}

function Row({ href, icon: Icon, label }: { href: string; icon: typeof Eye; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 border-b border-white/5 px-4 py-3.5 last:border-b-0">
      <Icon className="h-5 w-5 text-white/45" />
      <span className="flex-1 text-sm">{label}</span>
      <ChevronRight className="h-4 w-4 text-white/25" />
    </Link>
  );
}
