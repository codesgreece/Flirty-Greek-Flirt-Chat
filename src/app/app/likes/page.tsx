"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import { FlirtyButton } from "@/components/ui/FlirtyButton";
import { useApp } from "@/components/providers/AppProviders";
import { UpgradeModal } from "@/components/ui/Modal";
import { useRouter } from "next/navigation";

type Like = {
  id: string;
  kind: string;
  blurred: boolean;
  actor: { profile: { displayName: string; dateOfBirth: string; photos: { mediumKey: string }[] } | null };
  actorId: string;
};

export default function LikesPage() {
  const { me, toast } = useApp();
  const router = useRouter();
  const [rows, setRows] = useState<Like[]>([]);
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Like[]>("/api/flirts?view=incoming")
      .then((data) => {
        setRows(data);
        setLocked(data.some((r) => r.blurred));
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton className="h-64" />;
  if (!rows.length) {
    return <EmptyState title="No Likes yet" body="When someone Flirts you, they'll land here." />;
  }

  return (
    <section>
      <h1 className="text-2xl font-bold">Likes you</h1>
      <p className="mt-1 text-sm text-white/60">{locked ? "Gold reveals who already wants you." : "Flirt back and maybe it's a match."}</p>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
        {rows.map((row) => (
          <article key={row.id} className="overflow-hidden rounded-3xl bg-white/5">
            <div className={`h-44 bg-gradient-to-br from-pink-500/40 to-indigo-600/40 ${row.blurred ? "blur-md" : ""}`} />
            <div className="p-3">
              <p className="font-semibold">{row.blurred ? "Someone" : row.actor.profile?.displayName}</p>
              <p className="text-xs text-white/50">{row.kind.replace("_", " ")}</p>
              {!row.blurred && (
                <div className="mt-3 flex gap-2">
                  <FlirtyButton
                    className="min-h-9 flex-1 px-2 text-xs"
                    onClick={() =>
                      api("/api/flirts", {
                        method: "POST",
                        body: JSON.stringify({ targetId: row.actorId, kind: "FLIRT", idempotencyKey: crypto.randomUUID() }),
                      }).then(() => toast("Flirt sent ❤️"))
                    }
                  >
                    Flirt back
                  </FlirtyButton>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
      <UpgradeModal
        open={locked && me?.entitlements.plan === "FREE"}
        onClose={() => undefined}
        title="See who likes you"
        body="Gold shows the people already waiting."
        required="GOLD"
        onUpgrade={() => router.push("/pricing")}
      />
    </section>
  );
}
