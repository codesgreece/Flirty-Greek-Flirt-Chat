import type { CallState, Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import { getCallUnlock } from "@/server/chat/streak";

const LIVE: CallState[] = ["CALLING", "RINGING", "CONNECTED"];

async function requireMember(userId: string, conversationId: string) {
  const convo = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [{ userAId: userId }, { userBId: userId }],
      match: { active: true },
    },
  });
  if (!convo) throw new AppError("NOT_FOUND", "Conversation unavailable.", 404);
  return convo;
}

export async function startCall(userId: string, conversationId: string) {
  const convo = await requireMember(userId, conversationId);
  const unlock = await getCallUnlock(conversationId);
  if (!unlock.unlocked) {
    throw new AppError(
      "CALL_LOCKED",
      "Η κλήση ξεκλειδώνει μετά από 5 συνεχόμενες ημέρες συνομιλίας.",
      403,
      { remaining: unlock.remaining, currentStreak: unlock.currentStreak },
    );
  }
  const other = convo.userAId === userId ? convo.userBId : convo.userAId;
  const existing = await prisma.callSession.findFirst({
    where: { conversationId, state: { in: LIVE } },
    orderBy: { startedAt: "desc" },
  });
  if (existing) return existing;
  return prisma.callSession.create({
    data: {
      conversationId,
      callerId: userId,
      calleeId: other,
      state: "CALLING",
      ringingAt: new Date(),
    },
  });
}

export async function incomingCall(userId: string) {
  return prisma.callSession.findFirst({
    where: {
      calleeId: userId,
      state: { in: ["CALLING", "RINGING"] },
    },
    include: {
      caller: { include: { profile: { include: { photos: { where: { status: "APPROVED" }, take: 1, orderBy: { sortOrder: "asc" } } } } } },
      conversation: true,
    },
    orderBy: { startedAt: "desc" },
  });
}

export async function getCall(userId: string, callId: string) {
  const call = await prisma.callSession.findUnique({ where: { id: callId } });
  if (!call) throw new AppError("NOT_FOUND", "Call unavailable.", 404);
  if (call.callerId !== userId && call.calleeId !== userId) {
    throw new AppError("FORBIDDEN", "You cannot join this call.", 403);
  }
  return call;
}

export async function updateCallState(
  userId: string,
  callId: string,
  state: CallState,
  signaling?: Record<string, unknown>,
  endReason?: string,
) {
  const call = await getCall(userId, callId);
  const data: {
    state: CallState;
    signaling?: Prisma.InputJsonValue;
    ringingAt?: Date;
    answeredAt?: Date;
    endedAt?: Date;
    endReason?: string;
  } = { state };
  if (signaling) {
    const current = (call.signaling && typeof call.signaling === "object" ? call.signaling : {}) as Record<string, unknown>;
    data.signaling = { ...current, ...signaling } as Prisma.InputJsonValue;
  }
  if (state === "RINGING") data.ringingAt = new Date();
  if (state === "CONNECTED") data.answeredAt = new Date();
  if (state === "ENDED" || state === "DECLINED" || state === "MISSED") {
    data.endedAt = new Date();
    data.endReason = endReason ?? state.toLowerCase();
  }
  return prisma.callSession.update({ where: { id: call.id }, data });
}

export async function appendIce(userId: string, callId: string, candidate: unknown) {
  const call = await getCall(userId, callId);
  const current = (call.signaling && typeof call.signaling === "object" ? call.signaling : {}) as {
    ice?: unknown[];
  };
  const ice = [...(current.ice ?? []), candidate];
  return prisma.callSession.update({
    where: { id: call.id },
    data: { signaling: { ...current, ice } as Prisma.InputJsonValue },
  });
}
