"use client";

import { useState } from "react";

export function CookieBanner() {
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return !localStorage.getItem("flirty-cookie-choice");
  });
  if (!open) return null;
  return (
    <div className="fixed inset-x-4 bottom-28 z-40 rounded-3xl bg-black/80 p-4 text-sm backdrop-blur md:bottom-6 md:max-w-lg">
      <p>FLIRTY uses essential cookies to keep you signed in. Analytics cookies stay off unless you allow them.</p>
      <div className="mt-3 flex gap-2">
        <button
          className="rounded-full bg-white/10 px-3 py-2"
          onClick={() => {
            localStorage.setItem("flirty-cookie-choice", "essential");
            setOpen(false);
          }}
        >
          Essential only
        </button>
        <button
          className="rounded-full bg-flirty-pink px-3 py-2"
          onClick={() => {
            localStorage.setItem("flirty-cookie-choice", "all");
            setOpen(false);
          }}
        >
          Allow analytics
        </button>
      </div>
    </div>
  );
}
