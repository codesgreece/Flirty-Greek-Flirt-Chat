"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { EmptyState } from "@/components/ui/EmptyState";
import { FlirtyButton } from "@/components/ui/FlirtyButton";
import { useApp } from "@/components/providers/AppProviders";
import Link from "next/link";

export default function FlirtsPage() {
  const { toast } = useApp();
  const [matches, setMatches] = useState<Array<{ id: string; lowUser: { id: string; profile: { displayName: string } | null }; highUser: { id: string; profile: { displayName: string } | null }; conversation: { id: string } | null }>>([]);
  const [dms, setDms] = useState<Array<{ id: string; body: string; withSuperLike: boolean; sender: { id: string; profile: { displayName: string } | null } }>>([]);
  const [picks, setPicks] = useState<{ locked: boolean; cards: Array<{ userId: string; name: string; compatibility: { score: number } }> }>({ locked: false, cards: [] });

  useEffect(() => {
    api("/api/chat?type=matches").then(setMatches as never);
    api("/api/chat?type=dm").then(setDms as never);
    api("/api/discover?top=1").then(setPicks as never);
  }, []);

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Flirts & matches</h1>
        <p className="text-sm text-white/60">Matches live with your Flirts so the path stays intimate, not noisy.</p>
      </div>
      <div>
        <h2 className="font-semibold">Top Picks</h2>
        {picks.locked ? (
          <p className="mt-2 text-sm text-white/60">Top Picks unlock with Gold.</p>
        ) : picks.cards.length ? (
          <div className="mt-3 grid grid-cols-2 gap-3">
            {picks.cards.map((c) => (
              <div key={c.userId} className="rounded-3xl bg-white/5 p-4">
                <p className="font-semibold">{c.name}</p>
                <p className="text-xs text-flirty-pink">{c.compatibility.score}% match</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-white/50">No picks ready.</p>
        )}
      </div>
      <div>
        <h2 className="font-semibold">Matches</h2>
        {!matches.length ? (
          <EmptyState title="No matches yet" body="Your next connection might be one Flirt away." />
        ) : (
          <ul className="mt-3 space-y-2">
            {matches.map((m) => {
              const name = m.lowUser.profile?.displayName ?? m.highUser.profile?.displayName;
              return (
                <li key={m.id} className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                  <span>{name}</span>
                  {m.conversation ? (
                    <Link href={`/app/chat/${m.conversation.id}`} className="text-sm text-flirty-pink">
                      Open chat
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div>
        <h2 className="font-semibold">Direct Messages</h2>
        {!dms.length ? (
          <p className="mt-2 text-sm text-white/50">No Direct Messages yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {dms.map((dm) => (
              <li key={dm.id} className="rounded-3xl border border-amber-300/20 bg-amber-300/5 p-4">
                <p className="text-xs uppercase tracking-wide text-amber-200">Direct Message {dm.withSuperLike ? "· Super Flirt" : ""}</p>
                <p className="mt-1 font-semibold">{dm.sender.profile?.displayName}</p>
                <p className="mt-2 text-sm text-white/80">{dm.body}</p>
                <div className="mt-3 flex gap-2">
                  <FlirtyButton className="min-h-9 text-xs" onClick={() => api("/api/flirts", { method: "POST", body: JSON.stringify({ targetId: dm.sender.id, kind: "FLIRT", idempotencyKey: crypto.randomUUID() }) }).then(() => toast("Flirt sent ❤️"))}>
                    Flirt back
                  </FlirtyButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
