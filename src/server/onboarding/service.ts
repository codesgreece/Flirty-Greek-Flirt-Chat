import { Gender, DatingIntention, VibeCode } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import { ageFromDob, assertAdult } from "@/lib/dates";
import { track } from "@/server/analytics";
import { audit } from "@/server/audit";

export const ONBOARDING_STEPS = [
  "name",
  "dob",
  "gender",
  "seeking",
  "location",
  "intention",
  "interests",
  "vibe",
  "photos",
  "bio",
  "prompts",
  "verification",
  "compatibility",
  "preferences",
] as const;

export const onboardingSchema = z.object({
  displayName: z.string().min(2).max(40).optional(),
  dateOfBirth: z.string().optional(),
  gender: z.nativeEnum(Gender).optional(),
  seeking: z.array(z.nativeEnum(Gender)).optional(),
  city: z.string().max(80).optional(),
  country: z.string().max(80).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  datingIntention: z.nativeEnum(DatingIntention).optional(),
  interests: z.array(z.string()).optional(),
  vibes: z.array(z.nativeEnum(VibeCode)).optional(),
  bio: z.string().max(500).optional(),
  prompts: z.array(z.object({ question: z.string(), answer: z.string().max(180) })).optional(),
  lifestyle: z.record(z.string()).optional(),
  answers: z.record(z.string()).optional(),
  minAge: z.number().int().min(18).max(99).optional(),
  maxAge: z.number().int().min(18).max(99).optional(),
  maxDistanceKm: z.number().int().min(1).max(500).optional(),
  step: z.number().int().min(0).max(14),
});

export async function saveOnboarding(userId: string, raw: unknown) {
  const input = onboardingSchema.parse(raw);
  let dob: Date | undefined;
  if (input.dateOfBirth) {
    dob = new Date(input.dateOfBirth);
    if (Number.isNaN(dob.getTime())) throw new AppError("INVALID", "Enter a valid date of birth.", 400);
    try {
      assertAdult(dob);
    } catch {
      throw new AppError("UNDERAGE", "FLIRTY is only for adults 18 and over.", 403);
    }
  }

  const existing = await prisma.profile.findUnique({ where: { userId } });
  const profile = await prisma.profile.upsert({
    where: { userId },
    update: {
      displayName: input.displayName ?? existing?.displayName ?? "There",
      dateOfBirth: dob ?? existing?.dateOfBirth ?? new Date("1998-01-01"),
      gender: input.gender ?? existing?.gender ?? "OTHER",
      seeking: input.seeking ?? existing?.seeking ?? [],
      city: input.city ?? existing?.city,
      country: input.country ?? existing?.country,
      latitude: input.latitude ?? existing?.latitude,
      longitude: input.longitude ?? existing?.longitude,
      datingIntention: input.datingIntention ?? existing?.datingIntention,
      bio: input.bio ?? existing?.bio,
      prompts: input.prompts ?? existing?.prompts ?? [],
      lifestyle: input.lifestyle ?? existing?.lifestyle ?? {},
      onboardingStep: input.step,
    },
    create: {
      userId,
      displayName: input.displayName ?? "There",
      dateOfBirth: dob ?? new Date("1998-01-01"),
      gender: input.gender ?? "OTHER",
      seeking: input.seeking ?? [],
      city: input.city ?? "",
      country: input.country ?? "",
      latitude: input.latitude,
      longitude: input.longitude,
      datingIntention: input.datingIntention ?? "DATING",
      bio: input.bio ?? "",
      prompts: input.prompts ?? [],
      lifestyle: input.lifestyle ?? {},
      onboardingStep: input.step,
    },
  });

  if (dob && ageFromDob(dob) < 18) {
    throw new AppError("UNDERAGE", "FLIRTY is only for adults 18 and over.", 403);
  }

  if (input.interests) {
    const records = await prisma.interest.findMany({ where: { slug: { in: input.interests } } });
    await prisma.userInterest.deleteMany({ where: { userId } });
    await prisma.userInterest.createMany({
      data: records.map((interest) => ({ userId, interestId: interest.id })),
    });
  }
  if (input.vibes) {
    const records = await prisma.vibe.findMany({ where: { code: { in: input.vibes } } });
    await prisma.userVibe.deleteMany({ where: { userId } });
    await prisma.userVibe.createMany({
      data: records.map((vibe) => ({ userId, vibeId: vibe.id, intensity: 80 })),
    });
  }
  if (input.answers) {
    await prisma.compatibilityProfile.upsert({
      where: { userId },
      update: { answers: input.answers },
      create: { userId, answers: input.answers },
    });
  }
  await prisma.datingPreference.upsert({
    where: { userId },
    update: {
      minAge: input.minAge,
      maxAge: input.maxAge,
      maxDistanceKm: input.maxDistanceKm,
      genders: input.seeking,
    },
    create: {
      userId,
      minAge: input.minAge ?? 18,
      maxAge: input.maxAge ?? 45,
      maxDistanceKm: input.maxDistanceKm ?? 50,
      genders: input.seeking ?? [],
    },
  });

  if (input.step >= ONBOARDING_STEPS.length - 1) {
    await prisma.profile.update({
      where: { userId },
      data: { onboardingCompletedAt: new Date(), onboardingStep: ONBOARDING_STEPS.length },
    });
    await track("onboarding_completed", userId);
    await audit({ action: "PROFILE_UPDATED", userId, metadata: { onboarding: true } });
  }

  return profile;
}
