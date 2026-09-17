"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { CallSheet } from "@/features/chat/CallSheet";

type Incoming = {
  id: string;
  state: "IDLE" | "CALLING" | "RINGING" | "CONNECTED" | "ENDED" | "DECLINED" | "MISSED";
  conversationId: string;
  signaling?: { offer?: RTCSessionDescriptionInit; answer?: RTCSessionDescriptionInit; ice?: RTCIceCandidateInit[] };
  caller?: { profile?: { displayName?: string } | null } | null;
  conversation?: { id: string };
};

export function IncomingCallListener() {
  const [incoming, setIncoming] = useState<Incoming | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const row = await api<Incoming | null>("/api/chat?type=incoming-call");
        if (!cancelled) setIncoming(row && (row.state === "CALLING" || row.state === "RINGING") ? row : null);
      } catch {
        /* ignore */
      }
    }
    void tick();
    const t = setInterval(tick, 10000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  if (!incoming) return null;
  return (
    <CallSheet
      conversationId={incoming.conversationId}
      otherName={incoming.caller?.profile?.displayName ?? "Someone"}
      unlocked
      remaining={0}
      incoming={incoming}
      onClose={() => setIncoming(null)}
    />
  );
}
