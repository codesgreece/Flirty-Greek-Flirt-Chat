import type { MessageKind } from "@prisma/client";
import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import { assertNotBlocked } from "@/server/safety/service";
import { notify } from "@/server/notifications/service";
import { track } from "@/server/analytics";
import { consumeUsage } from "@/server/usage/counters";
import { saveChatImage, saveVoiceNote } from "@/server/storage/local";
import { conversationWith } from "@/server/matching/service";
import { ageFromDob } from "@/lib/dates";
import { isAllowedGifUrl, STICKERS } from "@/lib/stickers";
import { hasCapability, requireCapability } from "@/server/entitlements/engine";
import { CAPABILITIES } from "@/server/entitlements/catalog";
import { getRedis } from "@/server/redis";
import { recordChatActivity, getCallUnlock } from "@/server/chat/streak";
import { consumeWallet } from "@/server/shop/service";

const ONLINE_MS = 2 * 60_000;

function photoUrl(key?: string | null) {
  return key ? `/api/media/${key}` : null;
}

function isOnline(lastActiveAt: Date, presence: string | null) {
  if (presence) return true;
  return Date.now() - lastActiveAt.getTime() < ONLINE_MS;
}

export async function sendDirectMessage(input: {
  senderId: string;
  recipientId: string;
  body: string;
  withSuperLike?: boolean;
  idempotencyKey?: string;
}) {
  await assertNotBlocked(input.senderId, input.recipientId);
  if (input.senderId === input.recipientId) throw new AppError("INVALID", "You cannot message yourself.", 400);
  if (!input.body.trim()) throw new AppError("INVALID", "Write a message first.", 400);
  if (input.body.length > 280) throw new AppError("INVALID", "Direct messages can be 280 characters.", 400);
  const matched = await conversationWith(input.senderId, input.recipientId);
  if (matched) {
    throw new AppError("ALREADY_MATCHED", "You already matched. Open the conversation.", 409, {
      conversationId: matched.id,
    });
  }
  const canFirst = await hasCapability(input.senderId, CAPABILITIES.FIRST_MESSAGE);
  if (!canFirst) {
    const used = await consumeWallet(input.senderId, "firstMessages");
    if (!used) await requireCapability(input.senderId, CAPABILITIES.FIRST_MESSAGE, "PLATINUM");
  }
  if (input.idempotencyKey) {
    const hit = await prisma.idempotencyKey.findUnique({
      where: { userId_route_key: { userId: input.senderId, route: "dm", key: input.idempotencyKey } },
    });
    if (hit) return hit.response;
  }
  const unlimited = await hasCapability(input.senderId, CAPABILITIES.UNLIMITED_DIRECT_MESSAGES);
  if (!unlimited) await consumeUsage(input.senderId, "direct_messages");
  if (input.withSuperLike) {
    await consumeUsage(input.senderId, "super_likes");
  }
  const dm = await prisma.directMessage.create({
    data: {
      senderId: input.senderId,
      recipientId: input.recipientId,
      body: input.body.trim(),
      withSuperLike: Boolean(input.withSuperLike),
      idempotencyKey: input.idempotencyKey,
    },
  });
  const { recordInteraction } = await import("@/server/flirts/service");
  const liked = await recordInteraction({
    actorId: input.senderId,
    targetId: input.recipientId,
    kind: "LIKE",
    idempotencyKey: input.idempotencyKey ? `like:${input.idempotencyKey}` : undefined,
  }).catch(() => null);
  const conversationId =
    liked && typeof liked === "object" && liked !== null && "match" in liked
      ? ((liked.match as { conversationId?: string } | null)?.conversationId ?? null)
      : null;
  if (conversationId) {
    await sendChatMessage({
      senderId: input.senderId,
      conversationId,
      body: input.body.trim(),
      clientId: input.idempotencyKey ?? `dm-${dm.id}`,
    }).catch(() => undefined);
  }
  await notify({
    userId: input.recipientId,
    kind: "DIRECT_MESSAGE",
    title: "A first message arrived",
    body: "Someone reached out before a match.",
    payload: { id: dm.id },
  });
  await track("direct_message_sent", input.senderId);
  const result = { ...dm, conversationId };
  if (input.idempotencyKey) {
    await prisma.idempotencyKey.create({
      data: { userId: input.senderId, route: "dm", key: input.idempotencyKey, response: result as object },
    });
  }
  return result;
}

export async function incomingDirectMessages(userId: string) {
  return prisma.directMessage.findMany({
    where: { recipientId: userId },
    include: {
      sender: { include: { profile: { include: { photos: { where: { status: "APPROVED" }, take: 1, orderBy: { sortOrder: "asc" } } } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
}

async function requireConversation(userId: string, conversationId: string, allowInactive = false) {
  const convo = await prisma.conversation.findFirst({
    where: { id: conversationId, OR: [{ userAId: userId }, { userBId: userId }] },
    include: { match: true },
  });
  if (!convo) throw new AppError("NOT_FOUND", "Conversation unavailable.", 404);
  if (!convo.match.active && !allowInactive) {
    throw new AppError("UNMATCHED", "They unmatched you", 410, {
      unmatched: true,
      theyUnmatched: convo.match.unmatchedBy !== userId,
    });
  }
  return convo;
}

export async function sendChatMessage(input: {
  senderId: string;
  conversationId: string;
  body?: string;
  clientId: string;
  replyToId?: string;
  kind?: MessageKind;
  file?: File;
  gifUrl?: string;
  stickerId?: string;
  ephemeral?: boolean;
  durationMs?: number;
}) {
  const convo = await requireConversation(input.senderId, input.conversationId);
  const other = convo.userAId === input.senderId ? convo.userBId : convo.userAId;
  await assertNotBlocked(input.senderId, other);
  const existing = await prisma.message.findUnique({
    where: { conversationId_clientId: { conversationId: input.conversationId, clientId: input.clientId } },
  });
  if (existing) {
    const full = await prisma.message.findUnique({
      where: { id: existing.id },
      include: { reactions: true, replyTo: { select: { id: true, body: true, senderId: true, kind: true } } },
    });
    return serializeMessage(full ?? existing, input.senderId);
  }
  let media: {
    kind: MessageKind;
    body: string;
    mediaKey?: string;
    mediaThumbKey?: string;
    mediaMime?: string;
    mediaWidth?: number;
    mediaHeight?: number;
    ephemeral?: boolean;
    durationMs?: number;
  };
  if (input.stickerId) {
    const sticker = STICKERS.find((row) => row.id === input.stickerId);
    if (!sticker) throw new AppError("INVALID", "That sticker is not available.", 400);
    media = { kind: "STICKER", body: sticker.emoji };
  } else if (input.gifUrl) {
    if (!isAllowedGifUrl(input.gifUrl)) throw new AppError("INVALID", "That GIF source is not allowed.", 400);
    media = { kind: "GIF", body: input.gifUrl };
  } else if (input.file && input.kind === "VOICE") {
    if ((input.durationMs ?? 0) > 30_000) throw new AppError("INVALID", "Voice notes can be 30 seconds.", 400);
    const saved = await saveVoiceNote(`chat/${input.conversationId}`, input.file);
    media = {
      kind: "VOICE",
      body: "",
      mediaKey: saved.mediaKey,
      mediaMime: saved.mediaMime,
      durationMs: input.durationMs ?? 0,
    };
  } else if (input.file) {
    if (input.ephemeral) await requireCapability(input.senderId, CAPABILITIES.EPHEMERAL_PHOTO, "GOLD");
    const saved = await saveChatImage(input.conversationId, input.file);
    media = {
      kind: input.ephemeral ? "EPHEMERAL_PHOTO" : "PHOTO",
      body: input.body?.trim().slice(0, 500) ?? "",
      ephemeral: Boolean(input.ephemeral),
      ...saved,
    };
  } else {
    const text = (input.body ?? "").trim();
    if (!text) throw new AppError("INVALID", "Message cannot be empty.", 400);
    media = { kind: input.kind ?? "TEXT", body: text.slice(0, 2000) };
  }
  if (input.replyToId) {
    const parent = await prisma.message.findFirst({
      where: { id: input.replyToId, conversationId: input.conversationId, deletedAt: null },
    });
    if (!parent) throw new AppError("INVALID", "That message is gone.", 400);
  }
  const message = await prisma.message.create({
    data: {
      conversationId: input.conversationId,
      senderId: input.senderId,
      body: media.body,
      clientId: input.clientId,
      kind: media.kind,
      replyToId: input.replyToId,
      deliveredAt: new Date(),
      mediaKey: media.mediaKey,
      mediaThumbKey: media.mediaThumbKey,
      mediaMime: media.mediaMime,
      mediaWidth: media.mediaWidth,
      mediaHeight: media.mediaHeight,
      ephemeral: Boolean(media.ephemeral),
      durationMs: media.durationMs,
    },
    include: { reactions: true, replyTo: { select: { id: true, body: true, senderId: true, kind: true } } },
  });
  await prisma.conversation.update({
    where: { id: convo.id },
    data: { lastMessageAt: new Date() },
  });
  void recordChatActivity(convo.id, input.senderId);
  const preview =
    media.kind === "PHOTO" || media.kind === "EPHEMERAL_PHOTO"
      ? "Sent a photo"
      : media.kind === "GIF"
        ? "Sent a GIF"
        : media.kind === "STICKER"
          ? "Sent a sticker"
          : media.kind === "VOICE"
            ? "Sent a voice note"
            : media.body.slice(0, 80);
  await notify({
    userId: other,
    kind: "MESSAGE",
    title: "New message",
    body: preview,
    payload: { conversationId: convo.id },
  });
  await track("message_sent", input.senderId, { kind: media.kind });
  return serializeMessage(message, input.senderId);
}

function previewBody(kind: MessageKind, body: string) {
  if (kind === "PHOTO") return "Photo";
  if (kind === "EPHEMERAL_PHOTO") return "Photo · 1 view";
  if (kind === "GIF") return "GIF";
  if (kind === "STICKER") return body || "Sticker";
  if (kind === "VOICE") return "Voice note";
  return body;
}

function serializeMessage(
  message: {
    id: string;
    conversationId?: string;
    senderId: string;
    kind: MessageKind;
    body: string;
    clientId: string | null;
    createdAt: Date;
    editedAt: Date | null;
    deletedAt: Date | null;
    readAt: Date | null;
    deliveredAt?: Date | null;
    replyToId?: string | null;
    mediaKey?: string | null;
    mediaThumbKey?: string | null;
    mediaMime?: string | null;
    mediaWidth?: number | null;
    mediaHeight?: number | null;
    ephemeral?: boolean;
    viewedAt?: Date | null;
    durationMs?: number | null;
    reactions?: { emoji: string; userId: string }[];
    replyTo?: { id: string; body: string; senderId: string; kind: MessageKind } | null;
  },
  viewerId?: string,
) {
  const status = message.readAt ? "read" : message.deliveredAt ? "delivered" : "sent";
  const ephemeralLocked =
    (message.kind === "EPHEMERAL_PHOTO" || message.ephemeral) &&
    Boolean(message.viewedAt) &&
    viewerId !== message.senderId;
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    kind: message.kind,
    body: message.deletedAt || ephemeralLocked ? "" : message.body,
    clientId: message.clientId,
    createdAt: message.createdAt,
    editedAt: message.editedAt,
    deletedAt: message.deletedAt,
    readAt: message.readAt,
    deliveredAt: message.deliveredAt ?? message.createdAt,
    replyToId: message.replyToId ?? null,
    replyTo: message.replyTo ?? null,
    status,
    reactions: message.reactions ?? [],
    ephemeral: Boolean(message.ephemeral || message.kind === "EPHEMERAL_PHOTO"),
    viewed: Boolean(message.viewedAt),
    durationMs: message.durationMs ?? null,
    gifUrl: message.kind === "GIF" && !message.deletedAt ? message.body : null,
    sticker: message.kind === "STICKER" ? message.body : null,
    voice: message.kind === "VOICE" && message.mediaKey && !message.deletedAt
      ? { src: photoUrl(message.mediaKey), durationMs: message.durationMs ?? 0 }
      : null,
    photo:
      message.mediaKey && !ephemeralLocked && (message.kind === "PHOTO" || message.kind === "EPHEMERAL_PHOTO")
        ? {
            src: photoUrl(message.mediaKey),
            thumb: photoUrl(message.mediaThumbKey ?? message.mediaKey),
            width: message.mediaWidth,
            height: message.mediaHeight,
            ephemeral: message.kind === "EPHEMERAL_PHOTO",
          }
        : null,
  };
}

export async function listConversations(userId: string) {
  const rows = await prisma.conversation.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }], match: { active: true } },
    include: {
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      userA: {
        include: {
          profile: { include: { photos: { where: { status: "APPROVED" }, take: 1, orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] } } },
          privacy: true,
        },
      },
      userB: {
        include: {
          profile: { include: { photos: { where: { status: "APPROVED" }, take: 1, orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] } } },
          privacy: true,
        },
      },
    },
    orderBy: { lastMessageAt: "desc" },
  });
  const redis = getRedis();
  return Promise.all(
    rows.map(async (row) => {
      const other = row.userAId === userId ? row.userB : row.userA;
      const unread = await prisma.message.count({
        where: { conversationId: row.id, senderId: { not: userId }, readAt: null, deletedAt: null },
      });
      const presence = await redis.get(`presence:${other.id}`).catch(() => null);
      const last = row.messages[0];
      const showOnline = other.privacy?.showOnline ?? other.profile?.showOnline ?? true;
      return {
        id: row.id,
        matchId: row.matchId,
        muted: row.userAId === userId ? row.mutedByA : row.mutedByB,
        lastMessageAt: row.lastMessageAt,
        unreadCount: unread,
        lastMessage: last
          ? {
              body: previewBody(last.kind, last.body),
              kind: last.kind,
              senderId: last.senderId,
              createdAt: last.createdAt,
            }
          : null,
        yourTurn: Boolean(last && last.senderId !== userId),
        other: {
          id: other.id,
          name: other.profile?.displayName ?? "Someone",
          verified: other.profile?.verificationStatus === "VERIFIED",
          photo: photoUrl(other.profile?.photos[0]?.thumbKey ?? other.profile?.photos[0]?.mediumKey),
          online: showOnline && isOnline(other.lastActiveAt, presence),
          lastActiveAt: other.lastActiveAt,
        },
      };
    }),
  );
}

export async function conversationMeta(userId: string, conversationId: string) {
  const convo = await requireConversation(userId, conversationId, true);
  const otherId = convo.userAId === userId ? convo.userBId : convo.userAId;
  const unmatched = !convo.match.active;
  const theyUnmatched = unmatched && convo.match.unmatchedBy !== userId;
  const [other, unlock, presence] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: otherId },
      include: {
        profile: {
          include: {
            photos: { where: { status: "APPROVED" }, orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
          },
        },
        privacy: true,
        interests: { include: { interest: true } },
        vibes: { include: { vibe: true } },
      },
    }),
    getCallUnlock(conversationId),
    getRedis().get(`presence:${otherId}`).catch(() => null),
  ]);
  const showOnline = other.privacy?.showOnline ?? other.profile?.showOnline ?? true;
  return {
    id: convo.id,
    matchId: convo.matchId,
    muted: convo.userAId === userId ? convo.mutedByA : convo.mutedByB,
    call: unlock,
    meet: {
      unlocked: unlock.unlocked,
      remaining: unlock.remaining,
      prompt: "Want to meet this week?",
    },
    unmatched,
    theyUnmatched,
    composerLocked: unmatched,
    other: {
      id: other.id,
      name: other.profile?.displayName ?? "Someone",
      age: other.profile ? ageFromDob(other.profile.dateOfBirth) : null,
      verified: other.profile?.verificationStatus === "VERIFIED",
      bio: other.profile?.bio ?? "",
      city: other.profile?.city ?? "",
      intention: other.profile?.datingIntention ?? "DATING",
      photos: (other.profile?.photos ?? []).map((p) => ({
        id: p.id,
        src: `/api/media/${p.mediumKey}`,
        thumb: `/api/media/${p.thumbKey}`,
      })),
      interests: other.interests.map((i) => i.interest.label),
      vibes: other.vibes.map((v) => v.vibe.label),
      photo: photoUrl(other.profile?.photos[0]?.thumbKey ?? other.profile?.photos[0]?.mediumKey),
      online: showOnline && isOnline(other.lastActiveAt, presence),
      lastActiveAt: other.lastActiveAt,
    },
  };
}

export async function listMessages(userId: string, conversationId: string, cursor?: string) {
  await requireConversation(userId, conversationId, true);
  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      deletedAt: null,
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    },
    include: {
      reactions: true,
      replyTo: { select: { id: true, body: true, senderId: true, kind: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  await prisma.message.updateMany({
    where: { conversationId, senderId: { not: userId }, deliveredAt: null },
    data: { deliveredAt: new Date() },
  });
  return messages.reverse().map((row) => serializeMessage(row, userId));
}

export async function markConversationRead(userId: string, conversationId: string) {
  await requireConversation(userId, conversationId);
  await prisma.message.updateMany({
    where: { conversationId, senderId: { not: userId }, readAt: null },
    data: { readAt: new Date(), deliveredAt: new Date() },
  });
  return { ok: true };
}

export async function reactToMessage(userId: string, messageId: string, emoji: string) {
  const allowed = new Set(["❤️", "😂", "😍", "👍"]);
  if (!allowed.has(emoji)) throw new AppError("INVALID", "That reaction is not available.", 400);
  const message = await prisma.message.findUnique({ where: { id: messageId }, include: { conversation: true } });
  if (!message) throw new AppError("NOT_FOUND", "Message unavailable.", 404);
  if (message.conversation.userAId !== userId && message.conversation.userBId !== userId) {
    throw new AppError("FORBIDDEN", "You cannot react here.", 403);
  }
  const existing = await prisma.messageReaction.findUnique({
    where: { messageId_userId_emoji: { messageId, userId, emoji } },
  });
  if (existing) {
    await prisma.messageReaction.delete({ where: { id: existing.id } });
    return { removed: true, emoji };
  }
  return prisma.messageReaction.upsert({
    where: { messageId_userId_emoji: { messageId, userId, emoji } },
    update: {},
    create: { messageId, userId, emoji },
  });
}

export async function deleteOwnMessage(userId: string, messageId: string) {
  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message || message.senderId !== userId) throw new AppError("FORBIDDEN", "You can only delete your messages.", 403);
  await prisma.message.update({ where: { id: messageId }, data: { deletedAt: new Date(), body: "" } });
  return { ok: true };
}

export async function setTyping(conversationId: string, userId: string, typing: boolean) {
  const convo = await requireConversation(userId, conversationId);
  const isA = convo.userAId === userId;
  await prisma.conversation.update({
    where: { id: conversationId },
    data: isA ? { typingAAt: typing ? new Date() : null } : { typingBAt: typing ? new Date() : null },
  });
  const key = `typing:${conversationId}:${userId}`;
  if (typing) await getRedis().set(key, "1", "EX", 5).catch(() => undefined);
  else await getRedis().del(key).catch(() => undefined);
  return { ok: true };
}

export async function getTyping(conversationId: string, userId: string) {
  const convo = await requireConversation(userId, conversationId, true);
  if (!convo.match.active) return { typing: false, userId: convo.userAId === userId ? convo.userBId : convo.userAId };
  const other = convo.userAId === userId ? convo.userBId : convo.userAId;
  const stamped = convo.userAId === userId ? convo.typingBAt : convo.typingAAt;
  const fresh = Boolean(stamped && Date.now() - stamped.getTime() < 6000);
  if (fresh) return { typing: true, userId: other };
  const value = await getRedis().get(`typing:${conversationId}:${other}`).catch(() => null);
  return { typing: Boolean(value), userId: other };
}

export async function setPresence(userId: string, online: boolean) {
  if (online) {
    await getRedis().set(`presence:${userId}`, String(Date.now()), "EX", 45);
    await prisma.user.update({ where: { id: userId }, data: { lastActiveAt: new Date() } }).catch(() => undefined);
  } else {
    await getRedis().del(`presence:${userId}`);
  }
}

export async function muteConversation(userId: string, conversationId: string, muted: boolean) {
  const convo = await requireConversation(userId, conversationId);
  const data = convo.userAId === userId ? { mutedByA: muted } : { mutedByB: muted };
  await prisma.conversation.update({ where: { id: convo.id }, data });
  return { muted };
}

export async function viewEphemeral(userId: string, messageId: string) {
  const message = await prisma.message.findUnique({ where: { id: messageId }, include: { conversation: true } });
  if (!message) throw new AppError("NOT_FOUND", "Message unavailable.", 404);
  if (message.conversation.userAId !== userId && message.conversation.userBId !== userId) {
    throw new AppError("FORBIDDEN", "You cannot open that.", 403);
  }
  if (message.kind !== "EPHEMERAL_PHOTO" && !message.ephemeral) {
    return serializeMessage(message, userId);
  }
  if (message.senderId === userId) return serializeMessage(message, userId);
  if (!message.viewedAt) {
    await prisma.message.update({ where: { id: message.id }, data: { viewedAt: new Date() } });
  }
  return serializeMessage({ ...message, viewedAt: message.viewedAt ?? new Date() }, userId);
}

export async function canAccessMedia(userId: string, key: string) {
  if (!key.startsWith("chat/") && !key.startsWith("voice/")) return true;
  if (key.startsWith("voice/")) {
    const owner = key.split("/")[1];
    if (!owner) return false;
    return owner === userId || Boolean(await prisma.conversation.findFirst({
      where: { OR: [{ userAId: userId, userBId: owner }, { userAId: owner, userBId: userId }] },
    }));
  }
  const parts = key.split("/");
  const conversationId = parts[1];
  if (!conversationId) return false;
  const convo = await prisma.conversation.findFirst({
    where: { id: conversationId, OR: [{ userAId: userId }, { userBId: userId }] },
  });
  return Boolean(convo);
}
