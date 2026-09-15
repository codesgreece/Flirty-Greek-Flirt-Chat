"use client";

import Link from "next/link";
import { useApp } from "@/components/providers/AppProviders";
import { FlirtyButton } from "@/components/ui/FlirtyButton";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { me, toast, refresh } = useApp();
  const router = useRouter();
  if (!me?.profile) return null;
  return (
    <section className="mx-auto max-w-lg space-y-6">
      <div className="overflow-hidden rounded-[2rem] bg-white/5">
        <div className="h-72 bg-gradient-to-br from-pink-500/40 to-indigo-700/50" style={{ backgroundImage: me.profile.photos[0] ? `url(${me.profile.photos[0].src})` : undefined, backgroundSize: "cover" }} />
        <div className="p-5">
          <p className="text-3xl font-bold">
            {me.profile.name}, {me.profile.age} {me.profile.verified ? "✓" : ""}
          </p>
          <p className="text-sm text-white/60">{me.profile.city} · {me.entitlements.plan}</p>
          <p className="mt-3 text-white/80">{me.profile.bio}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {me.profile.vibes.map((v) => (
              <span key={v} className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs">{v}</span>
            ))}
            {me.profile.interests.map((v) => (
              <span key={v} className="rounded-full bg-white/10 px-3 py-1 text-xs">{v}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="grid gap-3">
        <Link href="/app/settings" className="rounded-2xl bg-white/5 px-4 py-4">Settings & privacy</Link>
        <Link href="/pricing" className="rounded-2xl bg-white/5 px-4 py-4">Subscription</Link>
        {me.isAdmin ? <Link href="/admin" className="rounded-2xl bg-white/5 px-4 py-4">Admin control center</Link> : null}
        <FlirtyButton
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
          variant="ghost"
          onClick={async () => {
            await api("/api/auth?action=logout", { method: "POST", body: "{}" });
            router.push("/");
          }}
        >
          Log out
        </FlirtyButton>
      </div>
    </section>
  );
}
