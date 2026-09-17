import { DatingIntention, InteractionKind, type PlanCode } from "@prisma/client";
import { prisma } from "@/server/db";
import { scoreCompatibility, type CompatibilityInput } from "@/server/compatibility/engine";
import { ageFromDob } from "@/lib/dates";
import { haversineKm, fuzzyDistanceLabel } from "@/lib/geo";
import { CAPABILITIES, PLAN_LIMITS } from "@/server/entitlements/catalog";
import { dailyVibeFor } from "@/lib/daily-vibe";
import { icebreakers } from "@/lib/icebreakers";
import { availabilityLabel, hitsDealbreaker, lifestyleChips, lifestyleRecord } from "@/lib/lifestyle";
import { findVibeRoom, type VibeRoomId } from "@/lib/vibe-rooms";

export const POSITIVE: InteractionKind[] = ["LIKE", "FLIRT", "SUPER_LIKE"];

export type DiscoverQuery = {
  cursor?: string;
  room?: VibeRoomId | string;
};

function originFor(user: {
  passport: { active: boolean; latitude: number; longitude: number; city?: string } | null;
  profile: { latitude: number | null; longitude: number | null } | null;
}) {
  if (user.passport?.active) return { latitude: user.passport.latitude, longitude: user.passport.longitude };
  if (user.profile?.latitude != null && user.profile.longitude != null) {
    return { latitude: user.profile.latitude, longitude: user.profile.longitude };
  }
  return null;
}

function asRecord(value: unknown): Record<string, string> {
  return lifestyleRecord(value);
}

function extraVibes(lifestyle: Record<string, string>) {
  return (lifestyle.extras ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parsePrompts(value: unknown): { question: string; answer: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const item = row as { question?: unknown; answer?: unknown };
      if (typeof item.question !== "string" || typeof item.answer !== "string") return null;
      if (!item.answer.trim()) return null;
      return { question: item.question, answer: item.answer };
    })
    .filter((row): row is { question: string; answer: string } => Boolean(row));
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

function nextRefillAt() {
  const inThreeHours = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const midnight = new Date();
  midnight.setUTCHours(24, 0, 0, 0);
  return inThreeHours < midnight ? inThreeHours : midnight;
}

export async function discoverFeed(userId: string, query: DiscoverQuery = {}) {
  const now = new Date();
  const recentlyActiveSince = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [me, seen, hidden, boosts, spotlights, blocks, overrides, signals] = await Promise.all([
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
      select: { id: true, targetId: true, kind: true, secondChanceShown: true },
    }),
    prisma.hiddenProfile.findMany({ where: { userId }, select: { hiddenId: true } }),
    prisma.boost.findMany({
      where: { status: "ACTIVE", expiresAt: { gt: now } },
      select: { userId: true },
    }),
    prisma.spotlight.findMany({
      where: { status: "ACTIVE", expiresAt: { gt: now } },
      select: { userId: true },
    }),
    prisma.block.findMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
      select: { blockerId: true, blockedId: true },
    }),
    prisma.userEntitlement.findMany({ where: { userId }, select: { capability: true, enabled: true } }),
    prisma.recommendationSignal.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 80,
      select: { subjectId: true, kind: true },
    }),
  ]);
  if (!me.profile?.onboardingCompletedAt) {
    return { cards: [], cursor: null, complete: false, empty: null, passport: null, dailyVibe: dailyVibeFor() };
  }
  const myProfile = me.profile;
  const room = findVibeRoom(query.room);
  const slow = myProfile.slowDiscover;

  const passed = seen.filter((row) => row.kind === "PASS");
  const passedIds = new Set(passed.map((row) => row.targetId));
  const secondChanceIds = new Set(
    (
      await prisma.interaction.findMany({
        where: {
          actorId: { in: [...passedIds] },
          targetId: userId,
          kind: "SUPER_LIKE",
          active: true,
        },
        select: { actorId: true },
      })
    )
      .map((row) => row.actorId)
      .filter((id) => {
        const pass = passed.find((row) => row.targetId === id);
        return Boolean(pass && !pass.secondChanceShown);
      }),
  );

  const exclude = new Set(
    [userId, ...seen.map((s) => s.targetId), ...hidden.map((h) => h.hiddenId)].filter(
      (id) => !secondChanceIds.has(id),
    ),
  );
  const liked = new Set(seen.filter((row) => POSITIVE.includes(row.kind)).map((row) => row.targetId));
  const blocked = new Set(blocks.map((row) => (row.blockerId === userId ? row.blockedId : row.blockerId)));
  const boosted = new Set(boosts.map((b) => b.userId));
  const spotlighted = new Set(spotlights.map((b) => b.userId));
  const moreLike = new Set(signals.filter((row) => row.kind === "MORE").map((row) => row.subjectId));
  const lessLike = new Set(signals.filter((row) => row.kind === "LESS").map((row) => row.subjectId));
  const plan = activePlan(me.subscription);
  const override = overrides.find((row) => row.capability === CAPABILITIES.PROFILE_PRIORITY);
  const priority = override ? override.enabled : PLAN_LIMITS[plan].capabilities.includes(CAPABILITIES.PROFILE_PRIORITY);

  const intentionFilter = me.preference?.intentions?.length
    ? (me.preference.intentions as DatingIntention[])
    : undefined;

  const candidates = await prisma.profile.findMany({
    where: {
      userId: { notIn: [...exclude] },
      onboardingCompletedAt: { not: null },
      discoverable: true,
      user: {
        status: "ACTIVE",
        ...(me.preference?.recentlyActive ? { lastActiveAt: { gte: recentlyActiveSince } } : {}),
      },
      ...(me.preference?.verifiedOnly ? { verificationStatus: "VERIFIED" } : {}),
      ...(me.preference?.hasPhotosOnly ? { photos: { some: { status: "APPROVED" } } } : {}),
      gender: me.preference?.genders?.length ? { in: me.preference.genders } : undefined,
      ...(intentionFilter ? { datingIntention: { in: intentionFilter } } : {}),
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
    take: 80,
  });

  const meOrigin = originFor(me);
  const selfBase = toCompatInput(me, null);
  const ranked: Array<{
    profile: (typeof candidates)[number];
    age: number;
    distance: number | null;
    compat: ReturnType<typeof scoreCompatibility>;
    rank: number;
    reasons: string[];
    secondChance: boolean;
  }> = [];

  for (const profile of candidates) {
    if (profile.incognito && !liked.has(profile.userId) && !secondChanceIds.has(profile.userId)) continue;
    if (blocked.has(profile.userId)) continue;
    const age = ageFromDob(profile.dateOfBirth);
    if (age < (me.preference?.minAge ?? 18) || age > (me.preference?.maxAge ?? 99)) continue;
    if (myProfile.seeking.length && !myProfile.seeking.includes(profile.gender)) continue;
    const lifestyle = asRecord(profile.lifestyle);
    if (hitsDealbreaker(me.preference?.dealbreakers ?? [], lifestyle)) continue;
    if (room && !roomMatches(room, profile.user.vibes.map((v) => v.vibe.code), extraVibes(lifestyle))) continue;
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
    if (slow && compat.score < 72 && !secondChanceIds.has(profile.userId)) continue;
    let rank = compat.score;
    if (boosted.has(profile.userId)) rank += 18;
    if (spotlighted.has(profile.userId)) rank += 28;
    if (profile.verificationStatus === "VERIFIED") rank += 6;
    rank += Math.min(10, profile.qualityScore / 10);
    if (profile.user.subscription?.plan.code === "PLATINUM") rank += 8;
    else if (profile.user.subscription?.plan.code === "GOLD") rank += 4;
    if (priority) rank += 2;
    rank += Math.max(0, 8 - (Date.now() - profile.user.lastActiveAt.getTime()) / 36e5);
    if (moreLike.has(profile.userId)) rank += 14;
    if (lessLike.has(profile.userId)) rank -= 22;
    if (secondChanceIds.has(profile.userId)) rank += 30;
    const overlapInterests = me.interests
      .map((i) => i.interest.label)
      .filter((label) => profile.user.interests.some((i) => i.interest.label === label));
    const overlapVibes = me.vibes
      .map((v) => v.vibe.label)
      .filter((label) => profile.user.vibes.some((v) => v.vibe.label === label));
    const reasons: string[] = [];
    if (secondChanceIds.has(profile.userId)) reasons.push("Second chance — they Super Liked you");
    if (overlapInterests.length) reasons.push(`Same interests: ${overlapInterests.slice(0, 2).join(", ")}`);
    else if (compat.interests >= 60) reasons.push("Shared interests");
    if (overlapVibes.length) reasons.push(`Similar vibe: ${overlapVibes[0]}`);
    else if (compat.vibe >= 60) reasons.push("Similar vibe");
    if (me.profile.datingIntention === profile.datingIntention) {
      reasons.push(`Both looking for ${profile.datingIntention.toLowerCase().replaceAll("_", " ")}`);
    } else if (compat.intent >= 70) reasons.push("Compatible dating intention");
    if (distance != null && distance <= 8) reasons.push("You're nearby");
    if (reasons.length < 2 && profile.verificationStatus === "VERIFIED") reasons.push("Verified profile");
    ranked.push({
      profile,
      age,
      distance,
      compat,
      rank,
      reasons: reasons.slice(0, 3),
      secondChance: secondChanceIds.has(profile.userId),
    });
  }

  ranked.sort((a, b) => b.rank - a.rank);
  const pageSize = room ? 24 : slow ? 3 : 8;
  const start = query.cursor ? ranked.findIndex((row) => row.profile.userId === query.cursor) + 1 : 0;
  const slice = ranked.slice(Math.max(0, start), Math.max(0, start) + pageSize);

  if (secondChanceIds.size) {
    const shown = slice.filter((row) => row.secondChance).map((row) => row.profile.userId);
    if (shown.length) {
      await prisma.interaction.updateMany({
        where: { actorId: userId, targetId: { in: shown }, kind: "PASS", active: true },
        data: { secondChanceShown: true },
      });
    }
  }

  const cards = slice.map((row) => serializeCard(row, myProfile));
  const empty = !cards.length
    ? {
        nextAt: nextRefillAt().toISOString(),
        hours: 3,
        message: "Back in 3 hours",
      }
    : null;

  return {
    cards,
    cursor: cards.at(-1)?.userId ?? null,
    complete: true,
    empty,
    room: room?.id ?? null,
    slow,
    dailyVibe: dailyVibeFor(),
    filters: {
      minAge: me.preference?.minAge ?? 18,
      maxAge: me.preference?.maxAge ?? 45,
      maxDistanceKm: me.preference?.maxDistanceKm ?? 50,
      verifiedOnly: me.preference?.verifiedOnly ?? false,
      recentlyActive: me.preference?.recentlyActive ?? false,
      intentions: me.preference?.intentions ?? [],
    },
    passport: me.passport?.active
      ? { city: me.passport.city, country: me.passport.country, active: true }
      : { city: myProfile.city, country: myProfile.country, active: false },
  };
}

function roomMatches(room: NonNullable<ReturnType<typeof findVibeRoom>>, vibes: string[], extras: string[]) {
  if (room.vibes.some((code) => vibes.includes(code))) return true;
  const extraNeed = "extras" in room ? [...room.extras] : [];
  return extraNeed.some((label) => extras.includes(label));
}

function serializeCard(
  row: {
    profile: {
      userId: string;
      displayName: string;
      verificationStatus: string;
      city: string;
      showDistance: boolean;
      datingIntention: DatingIntention;
      bio: string;
      bioEn: string;
      prompts: unknown;
      availability: string;
      dailyVibeQuestion: string;
      dailyVibeAnswer: string;
      dailyVibeAt: Date | null;
      voiceIntroKey: string | null;
      voiceIntroMs: number | null;
      heightCm: number | null;
      languages: string[];
      lifestyle: unknown;
      smartPhotoOrder: boolean;
      phoneVerifiedAt: Date | null;
      user: {
        emailVerifiedAt: Date | null;
        lastActiveAt: Date;
        interests: Array<{ interest: { label: string } }>;
        vibes: Array<{ vibe: { label: string; code: string } }>;
      };
      photos: Array<{ id: string; mediumKey: string; thumbKey: string; likeCount: number; sortOrder: number; isPrimary: boolean }>;
    };
    age: number;
    distance: number | null;
    compat: ReturnType<typeof scoreCompatibility>;
    reasons: string[];
    secondChance: boolean;
  },
  myProfile: { showDistance: boolean },
) {
  const lifestyle = asRecord(row.profile.lifestyle);
  const prompts = parsePrompts(row.profile.prompts);
  const photos = [...row.profile.photos].sort((a, b) => {
    if (row.profile.smartPhotoOrder) return b.likeCount - a.likeCount || a.sortOrder - b.sortOrder;
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    return a.sortOrder - b.sortOrder;
  });
  const vibeFresh =
    row.profile.dailyVibeAnswer &&
    row.profile.dailyVibeAt &&
    Date.now() - row.profile.dailyVibeAt.getTime() < 24 * 60 * 60 * 1000;
  const interests = row.profile.user.interests.map((i) => i.interest.label);
  const vibes = row.profile.user.vibes.map((v) => v.vibe.label);
  return {
    userId: row.profile.userId,
    name: row.profile.displayName,
    age: row.age,
    verified: row.profile.verificationStatus === "VERIFIED",
    emailVerified: Boolean(row.profile.user.emailVerifiedAt),
    phoneVerified: Boolean(row.profile.phoneVerifiedAt),
    city: row.profile.city,
    distanceLabel: fuzzyDistanceLabel(row.distance, row.profile.showDistance && myProfile.showDistance),
    intention: row.profile.datingIntention,
    bio: row.profile.bio,
    bioEn: row.profile.bioEn,
    prompts,
    interests,
    vibes,
    photos: photos.map((p) => ({
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
      overall: row.compat.score,
    },
    reasons: row.reasons,
    chips: lifestyleChips({
      heightCm: row.profile.heightCm,
      languages: row.profile.languages,
      lifestyle,
    }),
    availability: availabilityLabel(row.profile.availability),
    dailyVibe: vibeFresh
      ? { question: row.profile.dailyVibeQuestion, answer: row.profile.dailyVibeAnswer }
      : null,
    voiceIntro: row.profile.voiceIntroKey
      ? { src: `/api/media/${row.profile.voiceIntroKey}`, durationMs: row.profile.voiceIntroMs ?? 0 }
      : null,
    secondChance: row.secondChance,
    icebreakers: icebreakers({
      name: row.profile.displayName,
      reasons: row.reasons,
      interests,
      vibes,
      intention: row.profile.datingIntention,
      prompt: prompts[0] ?? null,
    }),
  };
}

export async function topPicks(userId: string) {
  const [override, sub] = await Promise.all([
    prisma.userEntitlement.findUnique({
      where: { userId_capability: { userId, capability: CAPABILITIES.TOP_PICKS } },
    }),
    prisma.subscription.findUnique({ where: { userId }, include: { plan: true } }),
  ]);
  const allowed = override
    ? override.enabled
    : PLAN_LIMITS[activePlan(sub)].capabilities.includes(CAPABILITIES.TOP_PICKS);
  if (!allowed) return { locked: true, cards: [] as Awaited<ReturnType<typeof discoverFeed>>["cards"] };
  const feed = await discoverFeed(userId);
  return { locked: false, cards: feed.cards.slice(0, 4), passport: feed.passport };
}

export async function recordSignal(userId: string, subjectId: string, kind: "MORE" | "LESS") {
  if (userId === subjectId) return { ok: false };
  await prisma.recommendationSignal.create({ data: { userId, subjectId, kind } });
  return { ok: true };
}
