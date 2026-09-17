"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import { UpgradeModal } from "@/components/ui/Modal";
import { useRouter } from "next/navigation";

type ViewRow = {
  id: string;
  createdAt: string;
  blurred: boolean;
  viewer: { id: string; name: string; age: number | null; photo: string | null; city: string };
};

export default function WhoViewedYouPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ViewRow[] | null>(null);
  const [locked, setLocked] = useState(false);
  const [upgrade, setUpgrade] = useState(false);

  useEffect(() => {
    api<{ locked: boolean; views: ViewRow[] }>("/api/views")
      .then((data) => {
        setLocked(data.locked);
        setRows(data.views);
      })
      .catch(() => setRows([]));
  }, []);

  if (!rows) return <Skeleton className="h-64" />;

  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-bold">Who viewed you</h1>
      {!rows.length ? (
        <EmptyState
          title={locked ? "See who viewed you" : "No views yet"}
          body={locked ? "Gold shows the people who stopped on your profile." : "When someone opens your profile, they show up here."}
          action={
            locked ? (
              <button type="button" className="rounded-full bg-flirty-pink px-4 py-2" onClick={() => setUpgrade(true)}>
                See plans
              </button>
            ) : null
          }
        />
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={row.blurred ? "/pricing" : `/app/u/${row.viewer.id}`}
                className="flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3"
                onClick={() => {
                  if (row.blurred) setUpgrade(true);
                }}
              >
                <div
                  className={`h-12 w-12 rounded-full bg-white/10 bg-cover bg-center ${row.blurred ? "blur-sm" : ""}`}
                  style={{ backgroundImage: row.viewer.photo ? `url(${row.viewer.photo})` : undefined }}
                />
                <div>
                  <p className="font-semibold">{row.blurred ? "Someone" : `${row.viewer.name}${row.viewer.age ? `, ${row.viewer.age}` : ""}`}</p>
                  <p className="text-xs text-white/50">{row.blurred ? "Gold reveals who it was" : row.viewer.city}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <UpgradeModal
        open={upgrade}
        onClose={() => setUpgrade(false)}
        title="See who viewed you"
        body="Gold shows the people who stopped on your profile."
        required="GOLD"
        onUpgrade={() => router.push("/pricing")}
      />
    </section>
  );
}
