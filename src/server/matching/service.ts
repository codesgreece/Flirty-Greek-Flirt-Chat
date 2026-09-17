import { prisma } from "@/server/db";
import { notify } from "@/server/notifications/service";
import { track } from "@/server/analytics";
import { getCompatibility } from "@/server/compatibility/service";
import { icebreakers } from "@/lib/icebreakers";

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
  const conversation = await prisma.conversation.findUnique({ where: { matchId: match.id } });
  const score = await getCompatibility(a, b);
  await notify({
    userId: a,
    kind: "MATCH",
    title: "It's a match",
    body: "You two liked each other.",
    payload: { matchId: match.id, score: score.score, conversationId: conversation?.id },
  });
  await notify({
    userId: b,
    kind: "MATCH",
    title: "It's a match",
    body: "You two liked each other.",
    payload: { matchId: match.id, score: score.score, conversationId: conversation?.id },
  });
  await track("match_created", a, { origin });
  const [me, other] = await Promise.all([
    prisma.user.findUnique({
      where: { id: a },
      include: { interests: { include: { interest: true } }, vibes: { include: { vibe: true } }, profile: true },
    }),
    prisma.user.findUnique({
      where: { id: b },
      include: { interests: { include: { interest: true } }, vibes: { include: { vibe: true } }, profile: true },
    }),
  ]);
  const prompts = Array.isArray(other?.profile?.prompts) ? (other?.profile?.prompts as unknown[]) : [];
  const firstPrompt = prompts.find((row): row is { question: string; answer: string } => {
    if (!row || typeof row !== "object") return false;
    const item = row as { question?: unknown; answer?: unknown };
    return typeof item.question === "string" && typeof item.answer === "string";
  });
  const lines = icebreakers({
    name: other?.profile?.displayName ?? "there",
    reasons: [],
    interests: overlapLabels(me?.interests.map((i) => i.interest.label) ?? [], other?.interests.map((i) => i.interest.label) ?? []),
    vibes: overlapLabels(me?.vibes.map((v) => v.vibe.label) ?? [], other?.vibes.map((v) => v.vibe.label) ?? []),
    intention: other?.profile?.datingIntention ?? "DATING",
    prompt: firstPrompt ?? null,
  });
  return {
    ...match,
    compatibility: score.score,
    breakdown: score,
    conversationId: conversation?.id ?? null,
    icebreakers: lines,
  };
}

function overlapLabels(a: string[], b: string[]) {
  const set = new Set(b);
  return a.filter((label) => set.has(label));
}

export async function conversationWith(userId: string, otherId: string) {
  const ids = ordered(userId, otherId);
  const match = await prisma.match.findFirst({
    where: { ...ids, active: true },
    include: { conversation: true },
  });
  return match?.conversation ?? null;
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
