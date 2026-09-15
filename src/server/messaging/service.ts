import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import { assertNotBlocked } from "@/server/safety/service";
import { notify } from "@/server/notifications/service";
import { track } from "@/server/analytics";
import { consumeUsage } from "@/server/usage/counters";
import { hasCapability } from "@/server/entitlements/engine";
import { CAPABILITIES } from "@/server/entitlements/catalog";
import { getRedis } from "@/server/redis";

export async function sendDirectMessage(input: {
  senderId: string;
  recipientId: string;
  body: string;
  withSuperLike?: boolean;
  idempotencyKey?: string;
}) {
  await assertNotBlocked(input.senderId, input.recipientId);
  if (!input.body.trim()) throw new AppError("INVALID", "Write a message first.", 400);
  if (input.body.length > 280) throw new AppError("INVALID", "Direct messages can be 280 characters.", 400);
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
  await notify({
    userId: input.recipientId,
    kind: "DIRECT_MESSAGE",
    title: "A Direct Message arrived",
    body: "Someone reached out before a match.",
    payload: { id: dm.id },
  });
  await track("direct_message_sent", input.senderId);
  if (input.idempotencyKey) {
    await prisma.idempotencyKey.create({
      data: { userId: input.senderId, route: "dm", key: input.idempotencyKey, response: dm as object },
    });
  }
  return dm;
}

export async function incomingDirectMessages(userId: string) {
  return prisma.directMessage.findMany({
    where: { recipientId: userId },
    include: {
      sender: { include: { profile: { include: { photos: { where: { status: "APPROVED" }, take: 1 } } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
}

export async function sendChatMessage(input: {
  senderId: string;
  conversationId: string;
  body: string;
  clientId: string;
}) {
  const convo = await prisma.conversation.findUnique({
    where: { id: input.conversationId },
    include: { match: true },
  });
  if (!convo || !convo.match.active) throw new AppError("NOT_FOUND", "Conversation unavailable.", 404);
  if (convo.userAId !== input.senderId && convo.userBId !== input.senderId) {
    throw new AppError("FORBIDDEN", "You cannot write here.", 403);
  }
  const other = convo.userAId === input.senderId ? convo.userBId : convo.userAId;
  await assertNotBlocked(input.senderId, other);
  if (!input.body.trim()) throw new AppError("INVALID", "Message cannot be empty.", 400);
  const existing = await prisma.message.findUnique({
    where: { conversationId_clientId: { conversationId: input.conversationId, clientId: input.clientId } },
  });
  if (existing) return existing;
  const message = await prisma.message.create({
    data: {
      conversationId: input.conversationId,
      senderId: input.senderId,
      body: input.body.trim().slice(0, 2000),
      clientId: input.clientId,
    },
  });
  await prisma.conversation.update({
    where: { id: convo.id },
    data: { lastMessageAt: new Date() },
  });
  await notify({
    userId: other,
    kind: "MESSAGE",
    title: "New message",
    body: "Someone in your matches wrote to you.",
    payload: { conversationId: convo.id },
  });
  await track("message_sent", input.senderId);
  return message;
}

export async function listConversations(userId: string) {
  return prisma.conversation.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }], match: { active: true } },
    include: {
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      userA: { include: { profile: { include: { photos: { where: { status: "APPROVED" }, take: 1 } } } } },
      userB: { include: { profile: { include: { photos: { where: { status: "APPROVED" }, take: 1 } } } } },
    },
    orderBy: { lastMessageAt: "desc" },
  });
}

export async function listMessages(userId: string, conversationId: string, cursor?: string) {
  const convo = await prisma.conversation.findFirst({
    where: { id: conversationId, OR: [{ userAId: userId }, { userBId: userId }] },
  });
  if (!convo) throw new AppError("NOT_FOUND", "Conversation unavailable.", 404);
  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      deletedAt: null,
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    },
    include: { reactions: true },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  return messages.reverse();
}

export async function markConversationRead(userId: string, conversationId: string) {
  await prisma.message.updateMany({
    where: { conversationId, senderId: { not: userId }, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function reactToMessage(userId: string, messageId: string, emoji: string) {
  const message = await prisma.message.findUnique({ where: { id: messageId }, include: { conversation: true } });
  if (!message) throw new AppError("NOT_FOUND", "Message unavailable.", 404);
  if (message.conversation.userAId !== userId && message.conversation.userBId !== userId) {
    throw new AppError("FORBIDDEN", "You cannot react here.", 403);
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
}

export async function setTyping(conversationId: string, userId: string, typing: boolean) {
  const key = `typing:${conversationId}:${userId}`;
  if (typing) await getRedis().set(key, "1", "EX", 5);
  else await getRedis().del(key);
}

export async function setPresence(userId: string, online: boolean) {
  if (online) await getRedis().set(`presence:${userId}`, String(Date.now()), "EX", 45);
  else await getRedis().del(`presence:${userId}`);
}
