import { NextRequest } from "next/server";
import { z } from "zod";
import { mutate } from "@/server/http";
import {
  incomingDirectMessages,
  listConversations,
  listMessages,
  sendChatMessage,
  sendDirectMessage,
  reactToMessage,
  deleteOwnMessage,
  markConversationRead,
} from "@/server/messaging/service";
import { listMatches, unmatch } from "@/server/matching/service";

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") ?? "conversations";
  const conversationId = req.nextUrl.searchParams.get("conversationId") ?? undefined;
  const cursor = req.nextUrl.searchParams.get("cursor") ?? undefined;
  return mutate({
    auth: "user",
    csrf: false,
    handler: async ({ userId }) => {
      if (type === "matches") return listMatches(userId!);
      if (type === "dm") return incomingDirectMessages(userId!);
      if (type === "messages" && conversationId) return listMessages(userId!, conversationId, cursor);
      return listConversations(userId!);
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const type = req.nextUrl.searchParams.get("type") ?? "chat";
  if (type === "dm") {
    return mutate({
      auth: "user",
      bucket: "direct_message",
      schema: z.object({
        recipientId: z.string().uuid(),
        body: z.string().min(1).max(280),
        withSuperLike: z.boolean().optional(),
        idempotencyKey: z.string().optional(),
      }),
      body,
      handler: ({ userId, data }) => {
        const payload = data as { recipientId: string; body: string; withSuperLike?: boolean; idempotencyKey?: string };
        return sendDirectMessage({ senderId: userId!, ...payload });
      },
    });
  }
  if (type === "react") {
    return mutate({
      auth: "user",
      schema: z.object({ messageId: z.string().uuid(), emoji: z.string().min(1).max(8) }),
      body,
      handler: ({ userId, data }) => reactToMessage(userId!, (data as { messageId: string }).messageId, (data as { emoji: string }).emoji),
    });
  }
  return mutate({
    auth: "user",
    bucket: "chat",
    schema: z.object({
      conversationId: z.string().uuid(),
      body: z.string().min(1).max(2000),
      clientId: z.string().min(4),
    }),
    body,
    handler: ({ userId, data }) => {
      const payload = data as { conversationId: string; body: string; clientId: string };
      return sendChatMessage({ senderId: userId!, ...payload });
    },
  });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  return mutate({
    auth: "user",
    schema: z.object({ conversationId: z.string().uuid() }),
    body,
    handler: ({ userId, data }) => markConversationRead(userId!, (data as { conversationId: string }).conversationId),
  });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const type = req.nextUrl.searchParams.get("type");
  if (type === "unmatch") {
    return mutate({
      auth: "user",
      schema: z.object({ matchId: z.string().uuid() }),
      body,
      handler: ({ userId, data }) => unmatch(userId!, (data as { matchId: string }).matchId),
    });
  }
  return mutate({
    auth: "user",
    schema: z.object({ messageId: z.string().uuid() }),
    body,
    handler: ({ userId, data }) => deleteOwnMessage(userId!, (data as { messageId: string }).messageId),
  });
}
