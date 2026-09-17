"use client";

import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";

type CallState = "IDLE" | "CALLING" | "RINGING" | "CONNECTED" | "ENDED" | "DECLINED" | "MISSED";

type CallRow = {
  id: string;
  state: CallState;
  callerId?: string;
  calleeId?: string;
  signaling?: { offer?: RTCSessionDescriptionInit; answer?: RTCSessionDescriptionInit; ice?: RTCIceCandidateInit[] };
};

export function CallSheet({
  conversationId,
  otherName,
  unlocked,
  remaining,
  incoming,
  onClose,
}: {
  conversationId: string;
  otherName: string;
  unlocked: boolean;
  remaining: number;
  incoming?: CallRow | null;
  onClose: () => void;
}) {
  const [call, setCall] = useState<CallRow | null>(incoming ?? null);
  const [error, setError] = useState("");
  const localRef = useRef<HTMLAudioElement>(null);
  const remoteRef = useRef<HTMLAudioElement>(null);
  const pc = useRef<RTCPeerConnection | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const appliedIce = useRef(0);

  useEffect(() => {
    return () => {
      stream.current?.getTracks().forEach((t) => t.stop());
      pc.current?.close();
    };
  }, []);

  useEffect(() => {
    if (!call?.id) return;
    const timer = setInterval(async () => {
      try {
        const fresh = await api<CallRow>(`/api/chat?type=call&callId=${call.id}`);
        setCall(fresh);
        if (fresh.state === "ENDED" || fresh.state === "DECLINED" || fresh.state === "MISSED") {
          stream.current?.getTracks().forEach((t) => t.stop());
          pc.current?.close();
        }
        const peer = pc.current;
        if (peer && fresh.signaling?.answer && !peer.currentRemoteDescription) {
          await peer.setRemoteDescription(fresh.signaling.answer);
        }
        const ice = fresh.signaling?.ice ?? [];
        if (peer) {
          for (const candidate of ice.slice(appliedIce.current)) {
            await peer.addIceCandidate(candidate).catch(() => undefined);
          }
          appliedIce.current = ice.length;
        }
      } catch {
        /* keep local UI state */
      }
    }, 1500);
    return () => clearInterval(timer);
  }, [call?.id]);

  async function ensurePeer() {
    const media = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    stream.current = media;
    if (localRef.current) localRef.current.srcObject = media;
    const peer = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    pc.current = peer;
    media.getTracks().forEach((track) => peer.addTrack(track, media));
    peer.ontrack = (event) => {
      const remote = event.streams[0] ?? null;
      if (remoteRef.current) remoteRef.current.srcObject = remote;
    };
    peer.onicecandidate = (event) => {
      if (event.candidate && call?.id) {
        void api("/api/chat?type=call-signal", {
          method: "POST",
          body: JSON.stringify({ callId: call.id, ice: event.candidate }),
        });
      }
    };
    return peer;
  }

  async function start() {
    setError("");
    try {
      const row = await api<CallRow>("/api/chat?type=call-start", {
        method: "POST",
        body: JSON.stringify({ conversationId }),
      });
      setCall(row);
      const peer = await ensurePeer();
      peer.onicecandidate = (event) => {
        if (event.candidate) {
          void api("/api/chat?type=call-signal", {
            method: "POST",
            body: JSON.stringify({ callId: row.id, ice: event.candidate }),
          });
        }
      };
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      await api("/api/chat?type=call-signal", {
        method: "POST",
        body: JSON.stringify({ callId: row.id, state: "RINGING", signaling: { offer } }),
      });
      setCall({ ...row, state: "RINGING" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't start the call.");
    }
  }

  async function answer() {
    if (!call) return;
    setError("");
    try {
      const peer = await ensurePeer();
      peer.onicecandidate = (event) => {
        if (event.candidate) {
          void api("/api/chat?type=call-signal", {
            method: "POST",
            body: JSON.stringify({ callId: call.id, ice: event.candidate }),
          });
        }
      };
      if (call.signaling?.offer) await peer.setRemoteDescription(call.signaling.offer);
      const next = await peer.createAnswer();
      await peer.setLocalDescription(next);
      await api("/api/chat?type=call-signal", {
        method: "POST",
        body: JSON.stringify({ callId: call.id, state: "CONNECTED", signaling: { answer: next } }),
      });
      setCall({ ...call, state: "CONNECTED" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't answer.");
    }
  }

  async function hangup(state: CallState = "ENDED") {
    if (call) {
      await api("/api/chat?type=call-signal", {
        method: "POST",
        body: JSON.stringify({ callId: call.id, state, endReason: state.toLowerCase() }),
      }).catch(() => undefined);
    }
    stream.current?.getTracks().forEach((t) => t.stop());
    pc.current?.close();
    onClose();
  }

  const incomingRing = Boolean(incoming) && (!call?.state || call.state === "CALLING" || call.state === "RINGING");

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/80 p-6">
      <div className="w-full max-w-sm rounded-[2rem] bg-[#120814] p-6 text-center">
        <p className="text-sm text-white/50">Voice call</p>
        <p className="mt-2 text-2xl font-bold">{otherName}</p>
        {!unlocked && !incoming ? (
          <>
            <p className="mt-6 text-4xl">🔒</p>
            <p className="mt-4 text-sm text-white/70">Η κλήση ξεκλειδώνει μετά από 5 συνεχόμενες ημέρες συνομιλίας.</p>
            <p className="mt-2 text-xs text-white/45">
              {remaining} day{remaining === 1 ? "" : "s"} to go
            </p>
          </>
        ) : (
          <>
            <p className="mt-4 text-sm text-white/60">
              {call?.state === "CONNECTED"
                ? "Connected"
                : incomingRing
                  ? "Incoming call"
                  : call
                    ? "Calling…"
                    : "Ready"}
            </p>
            <audio ref={localRef} muted autoPlay className="hidden" />
            <audio ref={remoteRef} autoPlay className="hidden" />
            {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
          </>
        )}
        <div className="mt-8 flex justify-center gap-3">
          {unlocked && !call && !incoming ? (
            <button type="button" className="rounded-full bg-emerald-500 px-5 py-3 font-semibold" onClick={start}>
              📞 Call
            </button>
          ) : null}
          {incomingRing ? (
            <button type="button" className="rounded-full bg-emerald-500 px-5 py-3 font-semibold" onClick={answer}>
              Answer
            </button>
          ) : null}
          <button
            type="button"
            className="rounded-full bg-white/10 px-5 py-3"
            onClick={() => hangup(incomingRing ? "DECLINED" : call ? "ENDED" : "ENDED")}
          >
            {incomingRing ? "Decline" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}
