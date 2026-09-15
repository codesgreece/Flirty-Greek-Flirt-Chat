"use client";

import { cn } from "@/lib/cn";

export function EmptyState({
  title,
  body,
  action,
  icon,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="glass mx-auto flex max-w-md flex-col items-center rounded-3xl px-6 py-12 text-center">
      <div className="mb-4 text-3xl" aria-hidden>
        {icon ?? "♡"}
      </div>
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mt-2 text-sm text-white/60">{body}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-2xl bg-white/10", className)} />;
}
