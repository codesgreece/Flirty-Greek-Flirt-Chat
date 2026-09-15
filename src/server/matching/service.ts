import { prisma } from "@/server/db";
import { notify } from "@/server/notifications/service";
import { track } from "@/server/analytics";
import { getCompatibility } from "@/server/compatibility/service";

function ordered(a: string, b: string) {
  return a < b ? { lowUserId: a, highUserId: b } : { lowUserId: b, highUserId: a };
}

export async function createMatchIfMutual(a: string, b: string, origin: string) {
  const reciprocal = await prisma.interaction.findFirst({
    where: {
      actorId: b,
      targetId: a,
      active: true,
      kind: { in: ["LIKE", "FLIRT", "SUPER_LIKE"] },
    },
  });
  if (!reciprocal) return null;
  const ids = ordered(a, b);
  const existing = await prisma.match.findFirst({
    where: { ...ids, active: true },
  });
  if (existing) return existing;
  const inactive = await prisma.match.findFirst({ where: ids, orderBy: { createdAt: "desc" } });
  const match = inactive
    ? await prisma.match.update({
        where: { id: inactive.id },
        data: { active: true, unmatchedAt: null, unmatchedBy: null, origin },
      })
    : await prisma.match.create({ data: { ...ids, origin } });
  await prisma.conversation.upsert({
    where: { matchId: match.id },
    update: {},
    create: { matchId: match.id, userAId: ids.lowUserId, userBId: ids.highUserId },
  });
  const score = await getCompatibility(a, b);
  await notify({
    userId: a,
    kind: "MATCH",
    title: "It's a match",
    body: "You two might have something.",
    payload: { matchId: match.id, score: score.score },
  });
  await notify({
    userId: b,
    kind: "MATCH",
    title: "It's a match",
    body: "You two might have something.",
    payload: { matchId: match.id, score: score.score },
  });
  await track("match_created", a, { origin });
  return { ...match, compatibility: score.score };
}

export async function unmatch(userId: string, matchId: string) {
  const match = await prisma.match.findFirst({
    where: { id: matchId, active: true, OR: [{ lowUserId: userId }, { highUserId: userId }] },
  });
  if (!match) return;
  await prisma.match.update({
    where: { id: match.id },
    data: { active: false, unmatchedAt: new Date(), unmatchedBy: userId },
  });
}

export async function listMatches(userId: string) {
  return prisma.match.findMany({
    where: { active: true, OR: [{ lowUserId: userId }, { highUserId: userId }] },
    include: {
      conversation: true,
      lowUser: { include: { profile: { include: { photos: { where: { status: "APPROVED" }, take: 1 } } } } },
      highUser: { include: { profile: { include: { photos: { where: { status: "APPROVED" }, take: 1 } } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}
