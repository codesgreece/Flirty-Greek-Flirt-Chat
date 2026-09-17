"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import { FlirtyButton } from "@/components/ui/FlirtyButton";
import { useApp } from "@/components/providers/AppProviders";
import { UpgradeModal } from "@/components/ui/Modal";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";

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
    Promise.all([
      api<Like[]>("/api/flirts?view=incoming"),
      api<MatchRow[]>("/api/chat?type=matches"),
    ])
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
    <section className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Likes & Matches</h1>
        <p className="mt-1 text-sm text-white/60">
          {locked ? "Gold reveals who already wants you." : "Like back and maybe it's a match."}
        </p>
      </div>

      {matches.length ? (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/50">Matches</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {matches.map((row) => {
              const other = row.lowUser.id === me?.id ? row.highUser : row.lowUser;
              const photo = other.profile?.photos[0]?.mediumKey ? `/api/media/${other.profile.photos[0].mediumKey}` : null;
              return (
                <Link key={row.id} href={row.conversation ? `/app/chat/${row.conversation.id}` : "/app/chat"} className="w-20 shrink-0 text-center">
                  <Avatar src={photo} name={other.profile?.displayName ?? "Match"} size={64} />
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
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {rows.map((row) => (
            <article key={row.id} className="overflow-hidden rounded-3xl bg-white/5">
              <div className={`h-44 bg-gradient-to-br from-pink-500/40 to-indigo-600/40 ${row.blurred ? "blur-md" : ""}`}
                style={{
                  backgroundImage: !row.blurred && row.actor.profile?.photos[0]?.mediumKey ? `url(/api/media/${row.actor.profile.photos[0].mediumKey})` : undefined,
                  backgroundSize: "cover",
                }}
              />
              <div className="p-3">
                <p className="font-semibold">{row.blurred ? "Someone" : row.actor.profile?.displayName}</p>
                <p className="text-xs text-white/50">{row.kind === "SUPER_LIKE" ? "Super Like" : "Like"}</p>
                {!row.blurred && (
                  <div className="mt-3 flex gap-2">
                    <FlirtyButton
                      type="button"
                      className="min-h-9 flex-1 px-2 text-xs"
                      onClick={() =>
                        api("/api/flirts", {
                          method: "POST",
                          body: JSON.stringify({ targetId: row.actorId, kind: "LIKE", idempotencyKey: crypto.randomUUID() }),
                        }).then(() => toast("Liked back ❤️"))
                      }
                    >
                      Like back
                    </FlirtyButton>
                  </div>
                )}
              </div>
            </article>
          ))}
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
