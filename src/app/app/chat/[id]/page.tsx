"use client";

import { useParams } from "next/navigation";
import { ConversationView } from "@/features/chat/ConversationView";

export default function ConversationPage() {
  const { id } = useParams<{ id: string }>();
  return <ConversationView conversationId={id} />;
}
