import { DatingIntention, Gender, VibeCode } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import { dailyVibeFor } from "@/lib/daily-vibe";
import { saveProfilePhoto } from "@/server/storage/local";
import { audit } from "@/server/audit";

export const profileUpdateSchema = z.object({
  displayName: z.string().min(2).max(40).optional(),
  bio: z.string().max(500).optional(),
  city: z.string().max(80).optional(),
  country: z.string().max(80).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  datingIntention: z.nativeEnum(DatingIntention).optional(),
  gender: z.nativeEnum(Gender).optional(),
  seeking: z.array(z.nativeEnum(Gender)).max(4).optional(),
  jobTitle: z.string().max(80).optional(),
  education: z.string().max(80).optional(),
  languages: z.array(z.string().max(40)).max(8).optional(),
  lifestyle: z.record(z.string().max(80)).optional(),
  interests: z.array(z.string()).max(12).optional(),
  vibes: z.array(z.nativeEnum(VibeCode)).max(6).optional(),
  minAge: z.number().int().min(18).max(99).optional(),
  maxAge: z.number().int().min(18).max(99).optional(),
  maxDistanceKm: z.number().int().min(1).max(500).optional(),
  verifiedOnly: z.boolean().optional(),
  hasPhotosOnly: z.boolean().optional(),
  recentlyActive: z.boolean().optional(),
  dealbreakers: z.array(z.string().max(40)).max(8).optional(),
  intentions: z.array(z.nativeEnum(DatingIntention)).max(5).optional(),
  bioEn: z.string().max(500).optional(),
  heightCm: z.number().int().min(120).max(230).nullable().optional(),
  availability: z.string().max(40).optional(),
  smartPhotoOrder: z.boolean().optional(),
  slowDiscover: z.boolean().optional(),
  hideFromContacts: z.boolean().optional(),
  dailyVibeAnswer: z.string().max(140).optional(),
  prompts: z.array(z.object({ question: z.string().max(120), answer: z.string().max(240) })).max(6).optional(),
});

export async function updateOwnProfile(userId: string, raw: unknown) {
  const input = profileUpdateSchema.parse(raw);
  const existing = await prisma.profile.findUnique({ where: { userId } });
  if (!existing) throw new AppError("INVALID", "Finish onboarding first.", 400);
  if (input.minAge != null && input.maxAge != null && input.minAge > input.maxAge) {
    throw new AppError("INVALID", "Age range is reversed.", 400);
  }
  const lifestyle =
    input.lifestyle != null
      ? { ...((existing.lifestyle as Record<string, string>) ?? {}), ...input.lifestyle }
      : undefined;
  const profile = await prisma.profile.update({
    where: { userId },
    data: {
      displayName: input.displayName,
      bio: input.bio,
      city: input.city,
      country: input.country,
      latitude: input.latitude,
      longitude: input.longitude,
      datingIntention: input.datingIntention,
      gender: input.gender,
      seeking: input.seeking,
      jobTitle: input.jobTitle,
      education: input.education,
      languages: input.languages,
      lifestyle,
      bioEn: input.bioEn,
      heightCm: input.heightCm === undefined ? undefined : input.heightCm,
      availability: input.availability,
      smartPhotoOrder: input.smartPhotoOrder,
      slowDiscover: input.slowDiscover,
      hideFromContacts: input.hideFromContacts,
      prompts: input.prompts,
      ...(input.dailyVibeAnswer != null
        ? {
            dailyVibeAnswer: input.dailyVibeAnswer,
            dailyVibeQuestion: dailyVibeFor(),
            dailyVibeAt: new Date(),
          }
        : {}),
    },
  });
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
  if (
    input.minAge != null ||
    input.maxAge != null ||
    input.maxDistanceKm != null ||
    input.seeking ||
    input.verifiedOnly != null ||
    input.hasPhotosOnly != null ||
    input.recentlyActive != null ||
    input.dealbreakers ||
    input.intentions
  ) {
    await prisma.datingPreference.upsert({
      where: { userId },
      update: {
        minAge: input.minAge,
        maxAge: input.maxAge,
        maxDistanceKm: input.maxDistanceKm,
        genders: input.seeking,
        intentions: input.intentions,
        verifiedOnly: input.verifiedOnly,
        hasPhotosOnly: input.hasPhotosOnly,
        recentlyActive: input.recentlyActive,
        dealbreakers: input.dealbreakers,
      },
      create: {
        userId,
        minAge: input.minAge ?? 18,
        maxAge: input.maxAge ?? 45,
        maxDistanceKm: input.maxDistanceKm ?? 50,
        genders: input.seeking ?? [],
        intentions: input.intentions ?? [],
        verifiedOnly: input.verifiedOnly ?? false,
        hasPhotosOnly: input.hasPhotosOnly ?? true,
        recentlyActive: input.recentlyActive ?? false,
        dealbreakers: input.dealbreakers ?? [],
      },
    });
  }
  void audit({ action: "PROFILE_UPDATED", userId });
  return profile;
}

export async function addProfilePhoto(userId: string, file: File) {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) throw new AppError("INVALID", "Finish onboarding first.", 400);
  const count = await prisma.profilePhoto.count({ where: { profileId: profile.id } });
  if (count >= 6) throw new AppError("LIMIT_REACHED", "You can keep up to 6 photos.", 429);
  return saveProfilePhoto(profile.id, file);
}

export async function removeProfilePhoto(userId: string, photoId: string) {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) throw new AppError("INVALID", "Finish onboarding first.", 400);
  const photo = await prisma.profilePhoto.findFirst({ where: { id: photoId, profileId: profile.id } });
  if (!photo) throw new AppError("NOT_FOUND", "Photo unavailable.", 404);
  await prisma.profilePhoto.delete({ where: { id: photo.id } });
  if (photo.isPrimary) {
    const next = await prisma.profilePhoto.findFirst({
      where: { profileId: profile.id },
      orderBy: { sortOrder: "asc" },
    });
    if (next) await prisma.profilePhoto.update({ where: { id: next.id }, data: { isPrimary: true } });
  }
  return { ok: true };
}

export async function reorderProfilePhotos(userId: string, photoIds: string[], primaryId?: string) {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) throw new AppError("INVALID", "Finish onboarding first.", 400);
  const photos = await prisma.profilePhoto.findMany({ where: { profileId: profile.id } });
  const owned = new Set(photos.map((p) => p.id));
  if (photoIds.some((id) => !owned.has(id))) throw new AppError("INVALID", "Unknown photo.", 400);
  await prisma.$transaction(
    photoIds.map((id, index) =>
      prisma.profilePhoto.update({
        where: { id },
        data: { sortOrder: index, isPrimary: (primaryId ?? photoIds[0]) === id },
      }),
    ),
  );
  return prisma.profilePhoto.findMany({ where: { profileId: profile.id }, orderBy: { sortOrder: "asc" } });
}
