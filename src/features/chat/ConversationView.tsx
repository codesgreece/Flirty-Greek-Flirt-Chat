"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { api, ApiError } from "@/lib/api";
import { useApp } from "@/components/providers/AppProviders";
import { Avatar } from "@/components/ui/Avatar";
import { ImageViewer } from "@/components/media/ImageViewer";
import { CallSheet } from "@/features/chat/CallSheet";
import { Modal } from "@/components/ui/Modal";
import { formatLastActive, formatMessageTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import { STARTER_GIFS, STICKERS } from "@/lib/stickers";

type ChatMessage = {
  id: string;
  body: string;
  senderId: string;
  createdAt: string;
  readAt: string | null;
  deliveredAt?: string | null;
  clientId: string | null;
  kind: string;
  status: "sent" | "delivered" | "read";
  reactions: { emoji: string; userId: string }[];
  replyTo?: { id: string; body: string; senderId: string; kind: string } | null;
  photo?: { src: string; thumb: string; width?: number; height?: number; ephemeral?: boolean } | null;
  gifUrl?: string | null;
  sticker?: string | null;
  voice?: { src: string; durationMs: number } | null;
  ephemeral?: boolean;
  viewed?: boolean;
};

type Meta = {
  id: string;
  matchId: string;
  muted: boolean;
  call: { currentStreak: number; required: number; unlocked: boolean; remaining: number };
  meet?: { unlocked: boolean; remaining: number; prompt: string };
  unmatched?: boolean;
  theyUnmatched?: boolean;
  composerLocked?: boolean;
  other: {
    id: string;
    name: string;
    verified: boolean;
    photo: string | null;
    online: boolean;
    lastActiveAt?: string;
    bio?: string;
    interests?: string[];
    photos: { id: string; src: string }[];
  };
};

export function ConversationView({ conversationId }: { conversationId: string }) {
  const { me, toast } = useApp();
  const router = useRouter();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [link, setLink] = useState<"live" | "reconnect" | "offline">("reconnect");
  const [menu, setMenu] = useState(false);
  const [reply, setReply] = useState<ChatMessage | null>(null);
  const [action, setAction] = useState<ChatMessage | null>(null);
  const [callOpen, setCallOpen] = useState(false);
  const [viewer, setViewer] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [unmatchOpen, setUnmatchOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [dateShare, setDateShare] = useState({ otherName: "", whenText: "", area: "" });
  const [dateOpen, setDateOpen] = useState(false);
  const [ephemeral, setEphemeral] = useState(false);
  const socket = useRef<Socket | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const voiceRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      const [nextMeta, nextMessages] = await Promise.all([
        api<Meta>(`/api/chat?type=meta&conversationId=${conversationId}`),
        api<ChatMessage[]>(`/api/chat?type=messages&conversationId=${conversationId}`),
      ]);
      if (cancelled) return;
      setMeta(nextMeta);
      setMessages(nextMessages);
      try {
        const opener = sessionStorage.getItem("flirty.opener");
        if (opener) {
          setText(opener);
          sessionStorage.removeItem("flirty.opener");
        }
      } catch {
        /* private mode */
      }
      await api("/api/chat", { method: "PATCH", body: JSON.stringify({ conversationId }) }).catch(() => undefined);
    }
    boot().catch(() => toast("Couldn't load this chat."));

    const s = io({ path: "/ws", reconnection: true, reconnectionAttempts: 6, reconnectionDelay: 800, reconnectionDelayMax: 8000, timeout: 2500 });
    socket.current = s;
    s.emit("conversation:join", conversationId);
    s.on("connect", () => setLink("live"));
    s.on("disconnect", () => setLink((prev) => (prev === "live" ? "reconnect" : prev)));
    s.on("connect_error", () => undefined);
    s.on("message:new", (msg: ChatMessage) => {
      setMessages((list) => (list.some((m) => m.id === msg.id || (msg.clientId && m.clientId === msg.clientId)) ? list : [...list, { ...msg, status: msg.status ?? "delivered" }]));
    });
    s.on("typing:start", () => setTyping(true));
    s.on("typing:stop", () => setTyping(false));

    const poll = setInterval(async () => {
      try {
        const [fresh, typingState] = await Promise.all([
          api<ChatMessage[]>(`/api/chat?type=messages&conversationId=${conversationId}`),
          api<{ typing: boolean }>(`/api/chat?type=typing&conversationId=${conversationId}`),
        ]);
        if (!cancelled) {
          setMessages(fresh);
          setTyping(typingState.typing);
          setLink(s.connected || navigator.onLine ? "live" : "offline");
        }
      } catch {
        if (!cancelled) setLink(navigator.onLine ? "reconnect" : "offline");
      }
    }, 2500);

    return () => {
      cancelled = true;
      clearInterval(poll);
      s.close();
    };
  }, [conversationId, toast]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages.length, typing]);

  async function send(e?: FormEvent) {
    e?.preventDefault();
    if (meta?.composerLocked) return;
    const body = text.trim();
    if (!body) return;
    const clientId = crypto.randomUUID();
    const optimistic: ChatMessage = {
      id: clientId,
      body,
      senderId: me?.id ?? "",
      createdAt: new Date().toISOString(),
      readAt: null,
      deliveredAt: null,
      clientId,
      kind: "TEXT",
      status: "sent",
      reactions: [],
      replyTo: reply ? { id: reply.id, body: reply.body, senderId: reply.senderId, kind: reply.kind } : null,
      photo: null,
    };
    setMessages((list) => [...list, optimistic]);
    setText("");
    const replyToId = reply?.id;
    setReply(null);
    try {
      if (socket.current?.connected) {
        socket.current.emit("message:send", { conversationId, body, clientId, replyToId });
        socket.current.emit("typing:stop", conversationId);
      } else {
        const saved = await api<ChatMessage>("/api/chat", {
          method: "POST",
          body: JSON.stringify({ conversationId, body, clientId, replyToId }),
        });
        setMessages((list) => list.map((m) => (m.clientId === clientId ? saved : m)));
      }
    } catch {
      toast("Couldn't send. Try again.");
    }
  }

  async function sendPhoto(file: File) {
    const clientId = crypto.randomUUID();
    const form = new FormData();
    form.set("file", file);
    form.set("conversationId", conversationId);
    form.set("clientId", clientId);
    form.set("body", text);
    if (ephemeral) form.set("ephemeral", "1");
    setText("");
    try {
      const saved = await api<ChatMessage>("/api/chat?type=photo", { method: "POST", body: form });
      setMessages((list) => [...list, saved]);
    } catch (error) {
      toast(error instanceof ApiError ? error.message : "Couldn't send that photo.");
    }
  }

  async function sendGif(url: string) {
    const saved = await api<ChatMessage>("/api/chat", {
      method: "POST",
      body: JSON.stringify({ conversationId, gifUrl: url, clientId: crypto.randomUUID() }),
    });
    setMessages((list) => [...list, saved]);
    setMediaOpen(false);
  }

  async function sendSticker(id: string) {
    const saved = await api<ChatMessage>("/api/chat", {
      method: "POST",
      body: JSON.stringify({ conversationId, stickerId: id, clientId: crypto.randomUUID() }),
    });
    setMessages((list) => [...list, saved]);
    setMediaOpen(false);
  }

  async function toggleVoice() {
    if (voiceRef.current) {
      voiceRef.current.stop();
      voiceRef.current = null;
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = new MediaRecorder(stream);
    chunks.current = [];
    rec.ondataavailable = (e) => chunks.current.push(e.data);
    rec.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks.current, { type: rec.mimeType || "audio/webm" });
      const file = new File([blob], "voice.webm", { type: blob.type });
      const form = new FormData();
      form.set("file", file);
      form.set("conversationId", conversationId);
      form.set("clientId", crypto.randomUUID());
      form.set("durationMs", "8000");
      const saved = await api<ChatMessage>("/api/chat?type=voice", { method: "POST", body: form });
      setMessages((list) => [...list, saved]);
    };
    voiceRef.current = rec;
    rec.start();
    toast("Recording… tap again to send");
  }

  async function react(messageId: string, emoji: string) {
    await api("/api/chat?type=react", { method: "POST", body: JSON.stringify({ messageId, emoji }) }).catch(() => undefined);
    const fresh = await api<ChatMessage[]>(`/api/chat?type=messages&conversationId=${conversationId}`);
    setMessages(fresh);
  }

  async function remove(messageId: string) {
    await api("/api/chat", { method: "DELETE", body: JSON.stringify({ messageId }) });
    setMessages((list) => list.filter((m) => m.id !== messageId));
    setAction(null);
  }

  async function safety(kind: "block" | "report" | "unmatch") {
    if (!meta) return;
    if (kind === "block") await api("/api/safety?action=block", { method: "POST", body: JSON.stringify({ userId: meta.other.id }) });
    if (kind === "unmatch") await api("/api/chat?type=unmatch", { method: "DELETE", body: JSON.stringify({ matchId: meta.matchId }) });
    if (kind === "report") {
      await api("/api/safety", {
        method: "POST",
        body: JSON.stringify({ reportedId: meta.other.id, category: "OTHER", details: "Reported from chat", messageId: action?.id }),
      });
    }
    setMenu(false);
    setReportOpen(false);
    if (kind !== "report") router.push("/app/chat");
    else toast("Report sent");
  }

  const photos = messages.filter((m) => m.photo?.src).map((m) => ({ src: m.photo!.src }));

  return (
    <section className="flex h-dvh bg-[#07040d] md:h-[calc(100dvh-2rem)]">
      <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-white/10 px-3 py-3" style={{ paddingTop: "calc(10px + var(--safe-top))" }}>
        <Link href="/app/chat" className="grid h-9 w-9 place-items-center rounded-full bg-white/10 md:hidden">
          ←
        </Link>
        {meta ? (
          <Link href={`/app/u/${meta.other.id}`} className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar src={meta.other.photo} name={meta.other.name} size={40} online={meta.other.online} verified={meta.other.verified} />
            <div className="min-w-0">
              <p className="truncate font-semibold">
                {meta.other.name} {meta.other.verified ? <span className="text-indigo-300">✓</span> : null}
              </p>
              <p className="text-[11px] text-white/45">
                {meta.theyUnmatched
                  ? "They unmatched you"
                  : meta.unmatched
                    ? "Unmatched"
                    : link === "offline"
                      ? "You're offline"
                      : link === "reconnect"
                        ? "Reconnecting"
                        : formatLastActive(meta.other.lastActiveAt, meta.other.online)}
              </p>
            </div>
          </Link>
        ) : (
          <p className="flex-1 text-sm text-white/50">Loading…</p>
        )}
        {meta?.meet?.unlocked ? (
          <button
            type="button"
            className="rounded-full bg-white/10 px-2 py-2 text-[10px] leading-tight"
            onClick={() => setText("Want to meet this week?")}
          >
            Meet?
          </button>
        ) : null}
        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-lg"
          onClick={() => setCallOpen(true)}
          aria-label={meta?.call.unlocked ? "Call" : "Call locked"}
          title={meta?.call.unlocked ? "Call" : "Η κλήση ξεκλειδώνει μετά από 5 συνεχόμενες ημέρες συνομιλίας."}
        >
          {meta?.call.unlocked ? "📞" : "🔒"}
        </button>
        <button type="button" className="grid h-10 w-10 place-items-center rounded-full bg-white/10" onClick={() => setMenu(true)}>
          ⋮
        </button>
      </header>

      <div ref={scroller} className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {meta?.theyUnmatched ? (
          <div className="rounded-2xl bg-white/5 px-4 py-3 text-center text-sm text-white/70">
            They unmatched you. This conversation is closed.
          </div>
        ) : null}
        {messages.map((m) => {
          const mine = m.senderId === me?.id;
          return (
            <button
              key={m.id}
              type="button"
              onContextMenu={(e) => {
                e.preventDefault();
                setAction(m);
              }}
              onClick={() => setAction(m)}
              className={cn("block max-w-[78%] text-left", mine ? "ml-auto" : "")}
            >
              {m.replyTo ? (
                <p className="mb-1 truncate rounded-xl bg-white/5 px-3 py-1 text-[11px] text-white/50">{m.replyTo.body || "Photo"}</p>
              ) : null}
              <div className={cn("rounded-[1.4rem] px-4 py-2 text-sm", mine ? "bg-gradient-to-r from-flirty-pink to-indigo-500" : "bg-white/10")}>
                {m.kind === "GIF" && m.gifUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.gifUrl} alt="" className="mb-2 max-h-48 rounded-2xl" />
                ) : null}
                {m.kind === "STICKER" ? <p className="text-4xl">{m.sticker || m.body}</p> : null}
                {m.voice ? <audio className="my-1 w-48" controls src={m.voice.src} /> : null}
                {m.ephemeral && !m.photo && m.senderId !== me?.id ? (
                  <button
                    type="button"
                    className="mb-2 text-xs underline"
                    onClick={async () => {
                      const opened = await api<ChatMessage>("/api/chat?type=view", { method: "POST", body: JSON.stringify({ messageId: m.id }) });
                      setMessages((list) => list.map((row) => (row.id === m.id ? opened : row)));
                      if (opened.photo?.src) setViewer(opened.photo.src);
                    }}
                  >
                    Photo · tap once
                  </button>
                ) : null}
                {m.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.photo.thumb || m.photo.src}
                    alt=""
                    className="mb-2 max-h-56 rounded-2xl object-cover"
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewer(m.photo!.src);
                    }}
                  />
                ) : null}
                {m.kind !== "STICKER" && m.kind !== "GIF" && m.kind !== "VOICE" ? m.body : null}
                <div className="mt-1 flex items-center justify-end gap-2 text-[10px] text-white/60">
                  <span>{formatMessageTime(m.createdAt)}</span>
                  {mine ? <span>{m.status === "read" ? "Read" : m.status === "delivered" ? "Delivered" : "Sent"}</span> : null}
                </div>
              </div>
              {m.reactions.length ? (
                <p className={cn("mt-1 text-sm", mine ? "text-right" : "")}>{m.reactions.map((r) => r.emoji).join(" ")}</p>
              ) : null}
            </button>
          );
        })}
        {typing && meta ? (
          <p className="text-xs text-white/50">
            {meta.other.name} is typing
            <span className="ml-1 inline-flex gap-0.5">
              <span className="h-1 w-1 animate-pulse rounded-full bg-white/70" />
              <span className="h-1 w-1 animate-pulse rounded-full bg-white/70 delay-150" />
              <span className="h-1 w-1 animate-pulse rounded-full bg-white/70 delay-300" />
            </span>
          </p>
        ) : null}
      </div>

      {reply ? (
        <div className="flex items-center justify-between border-t border-white/10 px-4 py-2 text-xs text-white/60">
          Replying to {reply.body || "photo"}
          <button type="button" onClick={() => setReply(null)}>
            ×
          </button>
        </div>
      ) : null}

      {meta?.composerLocked ? (
        <p className="px-4 py-4 text-center text-sm text-white/50">This conversation is closed.</p>
      ) : (
      <form className="flex items-end gap-2 px-3 pb-3" style={{ paddingBottom: "calc(12px + var(--safe-bottom))" }} onSubmit={send}>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && sendPhoto(e.target.files[0])} />
        <button type="button" className="grid h-11 w-11 place-items-center rounded-full bg-white/10" onClick={() => setMediaOpen(true)}>
          +
        </button>
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (socket.current?.connected) socket.current.emit(e.target.value ? "typing:start" : "typing:stop", conversationId);
            else void api("/api/chat?type=typing", { method: "POST", body: JSON.stringify({ conversationId, typing: Boolean(e.target.value) }) });
          }}
          className="min-h-11 flex-1 rounded-full bg-white/10 px-4 py-3 text-sm outline-none"
          placeholder="Write a message..."
        />
        <button type="button" className="grid h-11 w-11 place-items-center rounded-full bg-white/10" onClick={() => void toggleVoice()}>
          🎙
        </button>
        <button type="submit" className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-r from-flirty-pink to-indigo-500">
          ➤
        </button>
      </form>
      )}

      <Modal open={Boolean(action)} onClose={() => setAction(null)} title="Message">
        <div className="grid gap-2 text-sm">
          <button type="button" className="rounded-2xl bg-white/5 px-4 py-3 text-left" onClick={() => { setReply(action); setAction(null); }}>Reply</button>
          <button type="button" className="rounded-2xl bg-white/5 px-4 py-3 text-left" onClick={() => { if (action) void navigator.clipboard.writeText(action.body); setAction(null); }}>Copy</button>
          <div className="flex gap-2 px-1 py-2 text-lg">
            {["❤️", "😂", "😍", "👍"].map((emoji) => (
              <button key={emoji} type="button" onClick={() => action && react(action.id, emoji).then(() => setAction(null))}>
                {emoji}
              </button>
            ))}
          </div>
          {action?.senderId === me?.id ? (
            <button type="button" className="rounded-2xl bg-white/5 px-4 py-3 text-left text-rose-300" onClick={() => action && remove(action.id)}>Delete</button>
          ) : (
            <button type="button" className="rounded-2xl bg-white/5 px-4 py-3 text-left text-rose-300" onClick={() => { setReportOpen(true); setAction(null); }}>Report</button>
          )}
        </div>
      </Modal>

      <Modal open={menu} onClose={() => setMenu(false)} title={meta?.other.name}>
        <div className="grid gap-2 text-sm">
          <Link href={`/app/u/${meta?.other.id ?? ""}`} className="rounded-2xl bg-white/5 px-4 py-3">Profile</Link>
          <button type="button" className="rounded-2xl bg-white/5 px-4 py-3 text-left" onClick={() => meta && api("/api/chat?type=mute", { method: "POST", body: JSON.stringify({ conversationId, muted: !meta.muted }) }).then(() => setMenu(false))}>
            {meta?.muted ? "Unmute" : "Mute"}
          </button>
          <button type="button" className="rounded-2xl bg-white/5 px-4 py-3 text-left" onClick={() => safety("block")}>Block</button>
          <button type="button" className="rounded-2xl bg-white/5 px-4 py-3 text-left" onClick={() => setReportOpen(true)}>Report</button>
          <button type="button" className="rounded-2xl bg-white/5 px-4 py-3 text-left" onClick={() => { setDateOpen(true); setMenu(false); }}>Share my date</button>
          <button type="button" className="rounded-2xl bg-white/5 px-4 py-3 text-left text-rose-300" onClick={() => { setUnmatchOpen(true); setMenu(false); }}>Unmatch</button>
        </div>
      </Modal>

      <Modal open={unmatchOpen} onClose={() => setUnmatchOpen(false)} title="Unmatch?">
        <p className="text-sm text-white/70">This closes the conversation for both of you. You can always like them again later.</p>
        <div className="mt-4 flex gap-2">
          <button type="button" className="flex-1 rounded-full bg-white/10 py-3" onClick={() => setUnmatchOpen(false)}>Keep match</button>
          <button type="button" className="flex-1 rounded-full bg-rose-500 py-3" onClick={() => safety("unmatch")}>Unmatch</button>
        </div>
      </Modal>
      <Modal open={mediaOpen} onClose={() => setMediaOpen(false)} title="Send">
        <div className="grid gap-3 text-sm">
          <button type="button" className="rounded-2xl bg-white/5 px-4 py-3 text-left" onClick={() => fileRef.current?.click()}>Photo</button>
          <label className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
            Disappearing photo
            <input type="checkbox" checked={ephemeral} onChange={(e) => setEphemeral(e.target.checked)} />
          </label>
          <p className="text-xs text-white/50">GIFs</p>
          <div className="grid grid-cols-3 gap-2">
            {STARTER_GIFS.map((gif) => (
              <button key={gif.id} type="button" onClick={() => sendGif(gif.src)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={gif.src} alt={gif.label} className="h-20 w-full rounded-xl object-cover" />
              </button>
            ))}
          </div>
          <p className="text-xs text-white/50">Stickers</p>
          <div className="flex flex-wrap gap-2 text-2xl">
            {STICKERS.map((sticker) => (
              <button key={sticker.id} type="button" onClick={() => sendSticker(sticker.id)}>{sticker.emoji}</button>
            ))}
          </div>
        </div>
      </Modal>
      <Modal open={dateOpen} onClose={() => setDateOpen(false)} title="Share my date">
        <p className="text-sm text-white/60">Name, time and area only. No exact GPS.</p>
        <input className="mt-3 w-full rounded-2xl bg-white/5 px-4 py-3" placeholder="Name" value={dateShare.otherName} onChange={(e) => setDateShare({ ...dateShare, otherName: e.target.value })} />
        <input className="mt-2 w-full rounded-2xl bg-white/5 px-4 py-3" placeholder="Time" value={dateShare.whenText} onChange={(e) => setDateShare({ ...dateShare, whenText: e.target.value })} />
        <input className="mt-2 w-full rounded-2xl bg-white/5 px-4 py-3" placeholder="Area" value={dateShare.area} onChange={(e) => setDateShare({ ...dateShare, area: e.target.value })} />
        <button
          type="button"
          className="mt-4 w-full rounded-full bg-flirty-pink py-3"
          onClick={async () => {
            const row = await api<{ text: string }>("/api/settings?type=date-share", { method: "POST", body: JSON.stringify({ ...dateShare, otherName: dateShare.otherName || meta?.other.name }) });
            await navigator.clipboard.writeText(row.text).catch(() => undefined);
            toast("Copied a date note for a friend");
            setDateOpen(false);
          }}
        >
          Copy note
        </button>
      </Modal>
      <Modal open={reportOpen} onClose={() => setReportOpen(false)} title="Report">
        <p className="text-sm text-white/70">We will review this conversation privately.</p>
        <button type="button" className="mt-4 w-full rounded-full bg-flirty-pink py-3" onClick={() => safety("report")}>
          Send report
        </button>
      </Modal>

      {callOpen && meta ? (
        <CallSheet
          conversationId={conversationId}
          otherName={meta.other.name}
          unlocked={meta.call.unlocked}
          remaining={meta.call.remaining}
          onClose={() => setCallOpen(false)}
        />
      ) : null}
      {viewer ? (
        <ImageViewer
          photos={photos.length ? photos : [{ src: viewer }]}
          index={Math.max(0, photos.findIndex((p) => p.src === viewer))}
          onClose={() => setViewer(null)}
        />
      ) : null}
      </div>
      {meta ? (
        <aside className="hidden w-72 shrink-0 overflow-y-auto border-l border-white/10 p-5 xl:block">
          <Link href={`/app/u/${meta.other.id}`} className="block">
            <Avatar src={meta.other.photo} name={meta.other.name} size={88} verified={meta.other.verified} online={meta.other.online} className="mx-auto" />
            <p className="mt-3 text-center text-lg font-bold">
              {meta.other.name} {meta.other.verified ? <span className="text-indigo-300">✓</span> : null}
            </p>
          </Link>
          <p className="mt-1 text-center text-xs text-white/45">{formatLastActive(meta.other.lastActiveAt, meta.other.online)}</p>
          {meta.other.bio ? <p className="mt-4 text-sm text-white/70">{meta.other.bio}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            {meta.other.interests?.slice(0, 8).map((item) => (
              <span key={item} className="rounded-full bg-white/10 px-2 py-1 text-[11px]">
                {item}
              </span>
            ))}
          </div>
          <Link href={`/app/u/${meta.other.id}`} className="mt-6 block rounded-full bg-white/10 py-2 text-center text-sm">
            View profile
          </Link>
        </aside>
      ) : null}
    </section>
  );
}
