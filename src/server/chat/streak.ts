import { prisma } from "@/server/db";
import { startOfUtcDay } from "@/lib/dates";

const CALL_STREAK_DAYS = 5;

export function utcDay(date = new Date()) {
  return startOfUtcDay(date);
}

export function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return startOfUtcDay(next);
}

export function consecutiveStreak(qualifiedTimes: number[], from = new Date()) {
  const set = new Set(qualifiedTimes.map((t) => utcDay(new Date(t)).getTime()));
  let cursor = utcDay(from);
  if (!set.has(cursor.getTime())) cursor = addUtcDays(cursor, -1);
  let streak = 0;
  while (set.has(cursor.getTime())) {
    streak += 1;
    cursor = addUtcDays(cursor, -1);
  }
  return streak;
}

export async function recordChatActivity(conversationId: string, senderId: string) {
  const convo = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!convo) return null;
  const day = utcDay();
  const isA = convo.userAId === senderId;
  const row = await prisma.chatActivity.upsert({
    where: { conversationId_day: { conversationId, day } },
    create: {
      conversationId,
      day,
      userAMessaged: isA,
      userBMessaged: !isA,
    },
    update: isA ? { userAMessaged: true } : { userBMessaged: true },
  });
  if (row.userAMessaged && row.userBMessaged) {
    return recomputeChatStreak(conversationId);
  }
  return prisma.chatStreak.findUnique({ where: { conversationId } });
}

export async function recomputeChatStreak(conversationId: string) {
  const qualified = await prisma.chatActivity.findMany({
    where: { conversationId, userAMessaged: true, userBMessaged: true },
    orderBy: { day: "desc" },
    take: 40,
  });
  const qualifiedTimes = qualified.map((row) => startOfUtcDay(row.day).getTime());
  const streak = consecutiveStreak(qualifiedTimes);
  const lastQualified = qualified[0]?.day ?? null;
  const unlocked = streak >= CALL_STREAK_DAYS;
  const existing = await prisma.chatStreak.findUnique({ where: { conversationId } });
  return prisma.chatStreak.upsert({
    where: { conversationId },
    create: {
      conversationId,
      currentStreak: streak,
      longestStreak: streak,
      lastQualifiedDay: lastQualified,
      callUnlockedAt: unlocked ? new Date() : null,
    },
    update: {
      currentStreak: streak,
      longestStreak: Math.max(existing?.longestStreak ?? 0, streak),
      lastQualifiedDay: lastQualified,
      callUnlockedAt: unlocked ? existing?.callUnlockedAt ?? new Date() : null,
    },
  });
}

export async function getCallUnlock(conversationId: string) {
  const streak = await recomputeChatStreak(conversationId);
  return {
    currentStreak: streak.currentStreak,
    required: CALL_STREAK_DAYS,
    unlocked: streak.currentStreak >= CALL_STREAK_DAYS,
    remaining: Math.max(0, CALL_STREAK_DAYS - streak.currentStreak),
  };
}

export { CALL_STREAK_DAYS };
