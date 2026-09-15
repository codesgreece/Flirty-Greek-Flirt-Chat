"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { api } from "@/lib/api";
import { useApp } from "@/components/providers/AppProviders";
import { motion } from "framer-motion";
import { FlirtyButton } from "@/components/ui/FlirtyButton";

type Message = {
  id: string;
  body: string;
  senderId: string;
  createdAt: string;
  readAt: string | null;
  clientId: string | null;
  reactions: { emoji: string; userId: string }[];
};

export default function ConversationPage() {
  const { id } = useParams<{ id: string }>();
  const { me, toast } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [offline, setOffline] = useState(false);
  const socket = useRef<Socket | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<Message[]>(`/api/chat?type=messages&conversationId=${id}`).then(setMessages);
    const s = io({ path: "/ws" });
    socket.current = s;
    s.emit("conversation:join", id);
    s.on("message:new", (msg: Message) => {
      setMessages((list) => (list.some((m) => m.id === msg.id || m.clientId === msg.clientId) ? list : [...list, msg]));
    });
    s.on("typing:start", () => setTyping(true));
    s.on("typing:stop", () => setTyping(false));
    s.on("connect_error", () => setOffline(true));
    s.on("connect", () => setOffline(false));
    return () => {
      s.close();
    };
  }, [id]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const queue = useMemo(() => [] as string[], []);

  async function send() {
    const body = text.trim();
    if (!body) return;
    const clientId = crypto.randomUUID();
    const optimistic: Message = {
      id: clientId,
      body,
      senderId: me?.id ?? "",
      createdAt: new Date().toISOString(),
      readAt: null,
      clientId,
      reactions: [],
    };
    setMessages((list) => [...list, optimistic]);
    setText("");
    try {
      if (socket.current?.connected) {
        socket.current.emit("message:send", { conversationId: id, body, clientId });
      } else {
        await api("/api/chat", { method: "POST", body: JSON.stringify({ conversationId: id, body, clientId }) });
      }
    } catch {
      toast("Couldn't send. Retrying is safe.");
      queue.push(clientId);
    }
  }

  return (
    <section className="flex h-[calc(100dvh-8rem)] flex-col">
      <h1 className="text-lg font-bold">Conversation</h1>
      {offline ? <p className="text-xs text-amber-200">Connection lost. Trying again…</p> : null}
      <div ref={scroller} className="mt-3 flex-1 space-y-2 overflow-y-auto pb-3">
        {messages.map((m, i) => (
          <motion.div
            key={m.id}
            initial={i > messages.length - 4 ? { opacity: 0, y: 6, scale: 0.98 } : false}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={`max-w-[80%] rounded-3xl px-4 py-2 text-sm ${m.senderId === me?.id ? "ml-auto bg-gradient-to-r from-flirty-pink to-indigo-500" : "bg-white/10"}`}
          >
            {m.body}
            <div className="mt-1 text-[10px] text-white/60">
              {new Date(m.createdAt).toLocaleTimeString()} {m.readAt && m.senderId === me?.id ? "· read" : ""}
            </div>
          </motion.div>
        ))}
        {typing ? (
          <div className="flex gap-1 rounded-full bg-white/10 px-3 py-2 w-14">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white delay-150" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white delay-300" />
          </div>
        ) : null}
      </div>
      <form
        className="flex gap-2 pb-2"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            socket.current?.emit(e.target.value ? "typing:start" : "typing:stop", id);
          }}
          className="flex-1 rounded-full bg-white/10 px-4 py-3"
          placeholder="Write something kind"
        />
        <FlirtyButton type="submit">Send</FlirtyButton>
      </form>
    </section>
  );
}
