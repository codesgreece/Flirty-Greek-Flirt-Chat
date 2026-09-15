import { prisma } from "@/server/db";
import { scoreCompatibility, type CompatibilityInput } from "@/server/compatibility/engine";
import { ageFromDob } from "@/lib/dates";
import { haversineKm } from "@/lib/geo";
import { cacheGet, cacheSet } from "@/server/redis";

function asRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, String(v)]),
  );
}

export async function buildInput(userId: string, fromId?: string): Promise<CompatibilityInput> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      profile: true,
      interests: { include: { interest: true } },
      vibes: { include: { vibe: true } },
      preference: true,
      compatibility: true,
      passport: true,
    },
  });
  const originUser = fromId
    ? await prisma.user.findUnique({
        where: { id: fromId },
        include: { profile: true, passport: true },
      })
    : null;
  const loc = user.passport?.active
    ? { latitude: user.passport.latitude, longitude: user.passport.longitude }
    : user.profile?.latitude != null && user.profile.longitude != null
      ? { latitude: user.profile.latitude, longitude: user.profile.longitude }
      : null;
  const otherLoc =
    originUser?.passport?.active
      ? { latitude: originUser.passport.latitude, longitude: originUser.passport.longitude }
      : originUser?.profile?.latitude != null && originUser.profile.longitude != null
        ? { latitude: originUser.profile.latitude, longitude: originUser.profile.longitude }
        : null;
  const answers = asRecord(user.compatibility?.answers);
  return {
    interests: user.interests.map((row) => row.interest.slug),
    vibes: user.vibes.map((row) => row.vibe.code),
    intention: user.profile?.datingIntention ?? "DATING",
    age: user.profile ? ageFromDob(user.profile.dateOfBirth) : 25,
    preferredAge: {
      min: user.preference?.minAge ?? 18,
      max: user.preference?.maxAge ?? 45,
    },
    distanceKm: loc && otherLoc ? haversineKm(otherLoc, loc) : null,
    maxDistanceKm: user.preference?.maxDistanceKm ?? 80,
    lifestyle: asRecord(user.profile?.lifestyle),
    personality: answers,
    relationshipGoal: user.profile?.datingIntention ?? "DATING",
    activity: answers.activity ?? "",
    communication: answers.communication ?? user.compatibility?.communicationStyle ?? "",
  };
}

export async function getCompatibility(viewerId: string, subjectId: string) {
  const cacheKey = `compat:${viewerId}:${subjectId}`;
  const cached = await cacheGet<Awaited<ReturnType<typeof persistScore>>>(cacheKey);
  if (cached) return cached;
  const [self, other] = await Promise.all([buildInput(viewerId, subjectId), buildInput(subjectId, viewerId)]);
  const breakdown = scoreCompatibility(self, other);
  return persistScore(viewerId, subjectId, breakdown);
}

async function persistScore(
  viewerId: string,
  subjectId: string,
  breakdown: ReturnType<typeof scoreCompatibility>,
) {
  const row = await prisma.compatibilityScore.upsert({
    where: { viewerId_subjectId: { viewerId, subjectId } },
    update: { ...breakdown, computedAt: new Date() },
    create: { viewerId, subjectId, ...breakdown },
  });
  await cacheSet(`compat:${viewerId}:${subjectId}`, row, 60 * 30);
  return row;
}
