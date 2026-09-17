"use client";

import { ConversationList } from "@/features/chat/ConversationList";

export default function ChatListPage() {
  return (
    <>
      <section className="md:hidden">
        <h1 className="px-4 pt-2 text-2xl font-bold">Messages</h1>
        <ConversationList />
      </section>
      <div className="hidden h-full grid-cols-1 place-items-center text-white/40 md:grid">
        <p>Select a conversation</p>
      </div>
    </>
  );
}
