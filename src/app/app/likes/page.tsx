"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import { useApp } from "@/components/providers/AppProviders";
import { UpgradeModal } from "@/components/ui/Modal";
import { useRouter } from "next/navigation";
import { StoryAvatar } from "@/components/ui/Avatar";
import { Star } from "lucide-react";

type Like = {
  id: string;
  kind: string;
  blurred: boolean;
  actor: { profile: { displayName: string; photos: { mediumKey: string }[] } | null };
  actorId: string;
};

type MatchRow = {
  id: string;
  conversation: { id: string } | null;
  lowUser: { id: string; profile: { displayName: string; photos: { mediumKey: string }[] } | null };
  highUser: { id: string; profile: { displayName: string; photos: { mediumKey: string }[] } | null };
};

const UPGRADE_DISMISS_KEY = "flirty.likesUpgradeDismissed";

export default function LikesPage() {
  const { me, toast } = useApp();
  const router = useRouter();
  const [rows, setRows] = useState<Like[]>([]);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [upgradeDismissed, setUpgradeDismissed] = useState(false);

  useEffect(() => {
    try {
      setUpgradeDismissed(sessionStorage.getItem(UPGRADE_DISMISS_KEY) === "1");
    } catch {
      /* private mode */
    }
  }, []);

  useEffect(() => {
    Promise.all([api<Like[]>("/api/flirts?view=incoming"), api<MatchRow[]>("/api/chat?type=matches")])
      .then(([likes, nextMatches]) => {
        setRows(likes);
        setMatches(nextMatches);
        setLocked(likes.some((r) => r.blurred));
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton className="h-64" />;

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Likes You</h1>
        <p className="mt-1 text-sm text-white/55">
          {locked ? "Gold reveals who already wants you." : rows.length ? `${rows.length} ${rows.length === 1 ? "person likes" : "people like"} you` : "When someone likes you, they land here."}
        </p>
      </div>

      {matches.length ? (
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/40">Matches</h2>
          <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
            {matches.map((row) => {
              const other = row.lowUser.id === me?.id ? row.highUser : row.lowUser;
              const photo = other.profile?.photos[0]?.mediumKey ? `/api/media/${other.profile.photos[0].mediumKey}` : null;
              return (
                <Link key={row.id} href={row.conversation ? `/app/chat/${row.conversation.id}` : "/app/chat"} className="w-[4.5rem] shrink-0 text-center">
                  <StoryAvatar src={photo} name={other.profile?.displayName ?? "Match"} size={64} />
                  <p className="mt-1 truncate text-xs">{other.profile?.displayName}</p>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      {!rows.length ? (
        <EmptyState title="No Likes yet" body="When someone likes you, they'll land here." />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {rows.map((row) => {
            const photo = row.actor.profile?.photos[0]?.mediumKey ? `/api/media/${row.actor.profile.photos[0].mediumKey}` : undefined;
            return (
              <button
                key={row.id}
                type="button"
                className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-white/5 text-left"
                onClick={() => {
                  if (row.blurred) {
                    router.push("/pricing");
                    return;
                  }
                  api("/api/flirts", {
                    method: "POST",
                    body: JSON.stringify({ targetId: row.actorId, kind: "LIKE", idempotencyKey: crypto.randomUUID() }),
                  }).then(() => toast("Liked back ❤️"));
                }}
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br from-pink-500/40 to-indigo-600/40 bg-cover bg-center ${row.blurred ? "scale-110 blur-xl" : ""}`}
                  style={{ backgroundImage: !row.blurred && photo ? `url(${photo})` : undefined }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                {row.kind === "SUPER_LIKE" ? (
                  <span className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-sky-500 text-white">
                    <Star className="h-4 w-4 fill-current" />
                  </span>
                ) : null}
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <p className="font-semibold">{row.blurred ? "Someone" : row.actor.profile?.displayName}</p>
                  {row.blurred ? <p className="text-[11px] text-white/60">Gold reveals who</p> : null}
                </div>
              </button>
            );
          })}
        </div>
      )}
      <UpgradeModal
        open={locked && me?.entitlements.plan === "FREE" && !upgradeDismissed}
        onClose={() => {
          setUpgradeDismissed(true);
          try {
            sessionStorage.setItem(UPGRADE_DISMISS_KEY, "1");
          } catch {
            /* private mode */
          }
        }}
        title="See who likes you"
        body="Gold shows the people already waiting."
        required="GOLD"
        onUpgrade={() => router.push("/pricing")}
      />
    </section>
  );
}
