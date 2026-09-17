import { InteractionKind, type PlanCode } from "@prisma/client";
import { prisma } from "@/server/db";
import { scoreCompatibility, type CompatibilityInput } from "@/server/compatibility/engine";
import { ageFromDob } from "@/lib/dates";
import { haversineKm, fuzzyDistanceLabel } from "@/lib/geo";
import { CAPABILITIES, PLAN_LIMITS } from "@/server/entitlements/catalog";

export const POSITIVE: InteractionKind[] = ["LIKE", "FLIRT", "SUPER_LIKE"];

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

function asRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, String(v)]),
  );
}

function activePlan(sub: { status: string; expiresAt: Date; plan: { code: PlanCode } } | null): PlanCode {
  if (!sub || sub.status !== "ACTIVE" || sub.expiresAt < new Date()) return "FREE";
  return sub.plan.code;
}

function toCompatInput(
  user: {
    interests: Array<{ interest: { slug: string } }>;
    vibes: Array<{ vibe: { code: string } }>;
    preference: { minAge: number; maxAge: number; maxDistanceKm: number } | null;
    compatibility: { answers: unknown; communicationStyle: string | null } | null;
    profile: {
      datingIntention: string;
      dateOfBirth: Date;
      lifestyle: unknown;
    } | null;
  },
  distanceKm: number | null,
): CompatibilityInput {
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
    distanceKm,
    maxDistanceKm: user.preference?.maxDistanceKm ?? 80,
    lifestyle: asRecord(user.profile?.lifestyle),
    personality: answers,
    relationshipGoal: user.profile?.datingIntention ?? "DATING",
    activity: answers.activity ?? "",
    communication: answers.communication ?? user.compatibility?.communicationStyle ?? "",
  };
}

export async function discoverFeed(userId: string, cursor?: string) {
  const [me, seen, hidden, boosts, blocks, overrides] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        profile: true,
        preference: true,
        passport: true,
        interests: { include: { interest: true } },
        vibes: { include: { vibe: true } },
        compatibility: true,
        subscription: { include: { plan: true } },
      },
    }),
    prisma.interaction.findMany({
      where: { actorId: userId, active: true },
      select: { targetId: true, kind: true },
    }),
    prisma.hiddenProfile.findMany({ where: { userId }, select: { hiddenId: true } }),
    prisma.boost.findMany({
      where: { status: "ACTIVE", expiresAt: { gt: new Date() } },
      select: { userId: true },
    }),
    prisma.block.findMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
      select: { blockerId: true, blockedId: true },
    }),
    prisma.userEntitlement.findMany({ where: { userId }, select: { capability: true, enabled: true } }),
  ]);
  if (!me.profile?.onboardingCompletedAt) return { cards: [], cursor: null, complete: false };
  const myProfile = me.profile;

  const exclude = new Set([userId, ...seen.map((s) => s.targetId), ...hidden.map((h) => h.hiddenId)]);
  const liked = new Set(
    seen.filter((row) => POSITIVE.includes(row.kind)).map((row) => row.targetId),
  );
  const blocked = new Set(
    blocks.map((row) => (row.blockerId === userId ? row.blockedId : row.blockerId)),
  );
  const boosted = new Set(boosts.map((b) => b.userId));
  const plan = activePlan(me.subscription);
  const override = overrides.find((row) => row.capability === CAPABILITIES.PROFILE_PRIORITY);
  const priority = override ? override.enabled : PLAN_LIMITS[plan].capabilities.includes(CAPABILITIES.PROFILE_PRIORITY);

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
      user: {
        include: {
          interests: { include: { interest: true } },
          vibes: { include: { vibe: true } },
          passport: true,
          preference: true,
          compatibility: true,
          subscription: { include: { plan: true } },
        },
      },
      photos: { where: { status: "APPROVED" }, orderBy: { sortOrder: "asc" } },
    },
    take: 40,
  });

  const meOrigin = originFor(me);
  const selfBase = toCompatInput(me, null);
  const ranked = [];
  for (const profile of candidates) {
    if (profile.incognito && !liked.has(profile.userId)) continue;
    if (blocked.has(profile.userId)) continue;
    const age = ageFromDob(profile.dateOfBirth);
    if (age < (me.preference?.minAge ?? 18) || age > (me.preference?.maxAge ?? 99)) continue;
    if (myProfile.seeking.length && !myProfile.seeking.includes(profile.gender)) continue;
    const otherOrigin = originFor({ passport: profile.user.passport, profile });
    const distance = meOrigin && otherOrigin ? haversineKm(meOrigin, otherOrigin) : null;
    if (distance != null && distance > (me.preference?.maxDistanceKm ?? 80) + 25) continue;
    const other = toCompatInput(
      {
        interests: profile.user.interests,
        vibes: profile.user.vibes,
        preference: profile.user.preference,
        compatibility: profile.user.compatibility,
        profile,
      },
      distance,
    );
    const compat = scoreCompatibility(selfBase, other);
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
    distanceLabel: fuzzyDistanceLabel(row.distance, row.profile.showDistance && myProfile.showDistance),
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
  const [override, sub] = await Promise.all([
    prisma.userEntitlement.findUnique({
      where: { userId_capability: { userId, capability: CAPABILITIES.TOP_PICKS } },
    }),
    prisma.subscription.findUnique({ where: { userId }, include: { plan: true } }),
  ]);
  const allowed = override ? override.enabled : PLAN_LIMITS[activePlan(sub)].capabilities.includes(CAPABILITIES.TOP_PICKS);
  if (!allowed) return { locked: true, cards: [] as Awaited<ReturnType<typeof discoverFeed>>["cards"] };
  const feed = await discoverFeed(userId);
  return { locked: false, cards: feed.cards.slice(0, 4) };
}
