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
  conversationMeta,
  setTyping,
  getTyping,
  muteConversation,
  setPresence,
  viewEphemeral,
} from "@/server/messaging/service";
import { listMatches, unmatch } from "@/server/matching/service";
import { AppError } from "@/server/errors";
import {
  startCall,
  getCall,
  incomingCall,
  updateCallState,
  appendIce,
} from "@/server/calls/service";

export const preferredRegion = ["fra1"];

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") ?? "conversations";
  const conversationId = req.nextUrl.searchParams.get("conversationId") ?? undefined;
  const cursor = req.nextUrl.searchParams.get("cursor") ?? undefined;
  const callId = req.nextUrl.searchParams.get("callId") ?? undefined;
  return mutate({
    auth: "user",
    csrf: false,
    handler: async ({ userId }) => {
      void setPresence(userId!, true);
      if (type === "matches") return listMatches(userId!);
      if (type === "dm") return incomingDirectMessages(userId!);
      if (type === "meta" && conversationId) return conversationMeta(userId!, conversationId);
      if (type === "messages" && conversationId) return listMessages(userId!, conversationId, cursor);
      if (type === "typing" && conversationId) return getTyping(conversationId, userId!);
      if (type === "incoming-call") return incomingCall(userId!);
      if (type === "call" && callId) return getCall(userId!, callId);
      return listConversations(userId!);
    },
  });
}

export async function POST(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") ?? "chat";
  if (type === "photo") {
    const form = await req.formData();
    const file = form.get("file");
    const conversationId = String(form.get("conversationId") ?? "");
    const clientId = String(form.get("clientId") ?? crypto.randomUUID());
    const caption = String(form.get("body") ?? "");
    const ephemeral = String(form.get("ephemeral") ?? "") === "1";
    return mutate({
      auth: "user",
      bucket: "upload",
      handler: ({ userId }) => {
        if (!(file instanceof File)) throw new AppError("INVALID", "Choose a photo.", 400);
        return sendChatMessage({
          senderId: userId!,
          conversationId,
          clientId,
          body: caption,
          file,
          ephemeral,
        });
      },
    });
  }
  if (type === "voice") {
    const form = await req.formData();
    const file = form.get("file");
    const conversationId = String(form.get("conversationId") ?? "");
    const clientId = String(form.get("clientId") ?? crypto.randomUUID());
    const durationMs = Number(form.get("durationMs") ?? 0);
    return mutate({
      auth: "user",
      bucket: "upload",
      handler: ({ userId }) => {
        if (!(file instanceof File)) throw new AppError("INVALID", "Record a voice note first.", 400);
        return sendChatMessage({
          senderId: userId!,
          conversationId,
          clientId,
          kind: "VOICE",
          file,
          durationMs,
        });
      },
    });
  }
  const body = await req.json().catch(() => ({}));
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
  if (type === "typing") {
    return mutate({
      auth: "user",
      schema: z.object({ conversationId: z.string().uuid(), typing: z.boolean() }),
      body,
      handler: ({ userId, data }) =>
        setTyping((data as { conversationId: string }).conversationId, userId!, (data as { typing: boolean }).typing),
    });
  }
  if (type === "mute") {
    return mutate({
      auth: "user",
      schema: z.object({ conversationId: z.string().uuid(), muted: z.boolean() }),
      body,
      handler: ({ userId, data }) =>
        muteConversation(userId!, (data as { conversationId: string }).conversationId, (data as { muted: boolean }).muted),
    });
  }
  if (type === "view") {
    return mutate({
      auth: "user",
      schema: z.object({ messageId: z.string().uuid() }),
      body,
      handler: ({ userId, data }) => viewEphemeral(userId!, (data as { messageId: string }).messageId),
    });
  }
  if (type === "call-start") {
    return mutate({
      auth: "user",
      schema: z.object({ conversationId: z.string().uuid() }),
      body,
      handler: ({ userId, data }) => startCall(userId!, (data as { conversationId: string }).conversationId),
    });
  }
  if (type === "call-signal") {
    return mutate({
      auth: "user",
      schema: z.object({
        callId: z.string().uuid(),
        state: z.enum(["IDLE", "CALLING", "RINGING", "CONNECTED", "ENDED", "DECLINED", "MISSED"]).optional(),
        signaling: z.record(z.unknown()).optional(),
        ice: z.unknown().optional(),
        endReason: z.string().optional(),
      }),
      body,
      handler: async ({ userId, data }) => {
        const payload = data as {
          callId: string;
          state?: "IDLE" | "CALLING" | "RINGING" | "CONNECTED" | "ENDED" | "DECLINED" | "MISSED";
          signaling?: Record<string, unknown>;
          ice?: unknown;
          endReason?: string;
        };
        if (payload.ice) return appendIce(userId!, payload.callId, payload.ice);
        if (payload.state) return updateCallState(userId!, payload.callId, payload.state, payload.signaling, payload.endReason);
        if (payload.signaling) return updateCallState(userId!, payload.callId, "CALLING", payload.signaling);
        return getCall(userId!, payload.callId);
      },
    });
  }
  return mutate({
    auth: "user",
    bucket: "chat",
    schema: z.object({
      conversationId: z.string().uuid(),
      body: z.string().max(2000).optional(),
      clientId: z.string().min(4),
      replyToId: z.string().uuid().optional(),
      gifUrl: z.string().min(8).max(500).optional(),
      stickerId: z.string().max(40).optional(),
    }),
    body,
    handler: ({ userId, data }) => {
      const payload = data as {
        conversationId: string;
        body?: string;
        clientId: string;
        replyToId?: string;
        gifUrl?: string;
        stickerId?: string;
      };
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
