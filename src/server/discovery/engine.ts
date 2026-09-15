import { InteractionKind } from "@prisma/client";
import { prisma } from "@/server/db";
import { getCompatibility } from "@/server/compatibility/service";
import { ageFromDob } from "@/lib/dates";
import { haversineKm, fuzzyDistanceLabel } from "@/lib/geo";
import { hasCapability } from "@/server/entitlements/engine";
import { CAPABILITIES } from "@/server/entitlements/catalog";
import { areBlocked } from "@/server/safety/service";

function originFor(user: {
  passport: { active: boolean; latitude: number; longitude: number } | null;
  profile: { latitude: number | null; longitude: number | null } | null;
}) {
  if (user.passport?.active) return { latitude: user.passport.latitude, longitude: user.passport.longitude };
  if (user.profile?.latitude != null && user.profile.longitude != null) {
    return { latitude: user.profile.latitude, longitude: user.profile.longitude };
  }
  return null;
}

export async function discoverFeed(userId: string, cursor?: string) {
  const me = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { profile: true, preference: true, passport: true },
  });
  if (!me.profile?.onboardingCompletedAt) return { cards: [], cursor: null, complete: false };

  const seen = await prisma.interaction.findMany({
    where: { actorId: userId, active: true },
    select: { targetId: true },
  });
  const hidden = await prisma.hiddenProfile.findMany({ where: { userId } });
  const exclude = new Set([userId, ...seen.map((s) => s.targetId), ...hidden.map((h) => h.hiddenId)]);

  const boosts = await prisma.boost.findMany({
    where: { status: "ACTIVE", expiresAt: { gt: new Date() } },
    select: { userId: true },
  });
  const boosted = new Set(boosts.map((b) => b.userId));
  const priority = await hasCapability(userId, CAPABILITIES.PROFILE_PRIORITY);

  const candidates = await prisma.profile.findMany({
    where: {
      userId: { notIn: [...exclude] },
      onboardingCompletedAt: { not: null },
      discoverable: true,
      user: { status: "ACTIVE" },
      ...(me.preference?.verifiedOnly ? { verificationStatus: "VERIFIED" } : {}),
      gender: me.preference?.genders?.length ? { in: me.preference.genders } : undefined,
    },
    include: {
      user: { include: { interests: { include: { interest: true } }, vibes: { include: { vibe: true } }, passport: true, subscription: { include: { plan: true } } } },
      photos: { where: { status: "APPROVED" }, orderBy: { sortOrder: "asc" } },
    },
    take: 40,
  });

  const meOrigin = originFor(me);
  const ranked = [];
  for (const profile of candidates) {
    if (profile.incognito) {
      const incoming = await prisma.interaction.findFirst({
        where: { actorId: userId, targetId: profile.userId, active: true, kind: { in: ["LIKE", "FLIRT", "SUPER_LIKE"] } },
      });
      if (!incoming) continue;
    }
    if (await areBlocked(userId, profile.userId)) continue;
    const age = ageFromDob(profile.dateOfBirth);
    if (age < (me.preference?.minAge ?? 18) || age > (me.preference?.maxAge ?? 99)) continue;
    if (me.profile.seeking.length && !me.profile.seeking.includes(profile.gender)) continue;
    const otherOrigin = originFor({ passport: profile.user.passport, profile });
    const distance = meOrigin && otherOrigin ? haversineKm(meOrigin, otherOrigin) : null;
    if (distance != null && distance > (me.preference?.maxDistanceKm ?? 80) + 25) continue;
    const compat = await getCompatibility(userId, profile.userId);
    let rank = compat.score;
    if (boosted.has(profile.userId)) rank += 18;
    if (profile.verificationStatus === "VERIFIED") rank += 6;
    rank += Math.min(10, profile.qualityScore / 10);
    if (profile.user.subscription?.plan.code === "PLATINUM") rank += 8;
    else if (profile.user.subscription?.plan.code === "GOLD") rank += 4;
    if (priority) rank += 2;
    rank += Math.max(0, 8 - (Date.now() - profile.user.lastActiveAt.getTime()) / 36e5);
    ranked.push({ profile, age, distance, compat, rank });
  }

  ranked.sort((a, b) => b.rank - a.rank);
  const start = cursor ? ranked.findIndex((row) => row.profile.userId === cursor) + 1 : 0;
  const slice = ranked.slice(Math.max(0, start), Math.max(0, start) + 8);
  const cards = slice.map((row) => ({
    userId: row.profile.userId,
    name: row.profile.displayName,
    age: row.age,
    verified: row.profile.verificationStatus === "VERIFIED",
    city: row.profile.city,
    distanceLabel: fuzzyDistanceLabel(row.distance, row.profile.showDistance && (me.profile?.showDistance ?? true)),
    intention: row.profile.datingIntention,
    bio: row.profile.bio,
    prompts: row.profile.prompts,
    interests: row.profile.user.interests.map((i) => i.interest.label),
    vibes: row.profile.user.vibes.map((v) => v.vibe.label),
    photos: row.profile.photos.map((p) => ({
      id: p.id,
      src: `/api/media/${p.mediumKey}`,
      thumb: `/api/media/${p.thumbKey}`,
    })),
    compatibility: {
      score: row.compat.score,
      interests: row.compat.interests,
      vibe: row.compat.vibe,
      intent: row.compat.intent,
      lifestyle: row.compat.lifestyle,
      distance: row.compat.distance,
    },
  }));

  return {
    cards,
    cursor: cards.at(-1)?.userId ?? null,
    complete: true,
  };
}

export async function topPicks(userId: string) {
  const allowed = await hasCapability(userId, CAPABILITIES.TOP_PICKS);
  if (!allowed) return { locked: true, cards: [] as Awaited<ReturnType<typeof discoverFeed>>["cards"] };
  const feed = await discoverFeed(userId);
  return { locked: false, cards: feed.cards.slice(0, 4) };
}

export const POSITIVE: InteractionKind[] = ["LIKE", "FLIRT", "SUPER_LIKE"];
