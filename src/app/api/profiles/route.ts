import { NextRequest } from "next/server";
import { mutate } from "@/server/http";
import { getCompatibility } from "@/server/compatibility/service";
import { prisma } from "@/server/db";
import { ageFromDob } from "@/lib/dates";
import { AppError } from "@/server/errors";
import { conversationWith } from "@/server/matching/service";
import { hasCapability } from "@/server/entitlements/engine";
import { CAPABILITIES } from "@/server/entitlements/catalog";
import {
  addProfilePhoto,
  removeProfilePhoto,
  reorderProfilePhotos,
  updateOwnProfile,
} from "@/server/profiles/service";
import { recordProfileView } from "@/server/views/service";
import { saveVoiceIntro } from "@/server/storage/local";
import { lifestyleChips, lifestyleRecord, availabilityLabel } from "@/lib/lifestyle";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  return mutate({
    auth: "user",
    csrf: false,
    handler: async ({ userId: viewerId }) => {
      if (!userId) throw new AppError("INVALID", "Missing profile.", 400);
      const profile = await prisma.profile.findUnique({
        where: { userId },
        include: {
          photos: { where: { status: "APPROVED" }, orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
          user: {
            include: {
              interests: { include: { interest: true } },
              vibes: { include: { vibe: true } },
              preference: true,
            },
          },
        },
      });
      if (!profile) throw new AppError("NOT_FOUND", "Profile unavailable.", 404);
      if (viewerId !== userId) void recordProfileView(viewerId!, userId);
      const vibeFresh =
        profile.dailyVibeAnswer &&
        profile.dailyVibeAt &&
        Date.now() - profile.dailyVibeAt.getTime() < 24 * 60 * 60 * 1000;
      const [compat, convo, liked, canFirstMessage] = await Promise.all([
        getCompatibility(viewerId!, userId),
        conversationWith(viewerId!, userId),
        prisma.interaction.findFirst({
          where: { actorId: viewerId!, targetId: userId, active: true, kind: { in: ["LIKE", "FLIRT", "SUPER_LIKE"] } },
        }),
        hasCapability(viewerId!, CAPABILITIES.FIRST_MESSAGE),
      ]);
      return {
        userId,
        name: profile.displayName,
        age: ageFromDob(profile.dateOfBirth),
        verified: profile.verificationStatus === "VERIFIED",
        emailVerified: Boolean(profile.user.emailVerifiedAt),
        phoneVerified: Boolean(profile.phoneVerifiedAt),
        bio: profile.bio,
        bioEn: profile.bioEn,
        city: profile.city,
        jobTitle: profile.jobTitle,
        education: profile.education,
        languages: profile.languages,
        lifestyle: profile.lifestyle,
        heightCm: profile.heightCm,
        chips: lifestyleChips({
          heightCm: profile.heightCm,
          languages: profile.languages,
          lifestyle: lifestyleRecord(profile.lifestyle),
        }),
        availability: availabilityLabel(profile.availability),
        dailyVibe: vibeFresh ? { question: profile.dailyVibeQuestion, answer: profile.dailyVibeAnswer } : null,
        voiceIntro: profile.voiceIntroKey
          ? { src: `/api/media/${profile.voiceIntroKey}`, durationMs: profile.voiceIntroMs ?? 0 }
          : null,
        gender: profile.gender,
        seeking: profile.seeking,
        intention: profile.datingIntention,
        prompts: profile.prompts,
        interests: profile.user.interests.map((i) => i.interest.label),
        interestSlugs: profile.user.interests.map((i) => i.interest.slug),
        vibes: profile.user.vibes.map((v) => v.vibe.label),
        vibeCodes: profile.user.vibes.map((v) => v.vibe.code),
        photos: profile.photos.map((p) => ({
          id: p.id,
          src: `/api/media/${p.mediumKey}`,
          thumb: `/api/media/${p.thumbKey}`,
          isPrimary: p.isPrimary,
        })),
        compatibility: compat,
        liked: Boolean(liked),
        matched: Boolean(convo),
        conversationId: convo?.id ?? null,
        canFirstMessage,
        mine: viewerId === userId,
      };
    },
  });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  return mutate({
    auth: "user",
    bucket: "profile",
    body,
    handler: ({ userId, data }) => updateOwnProfile(userId!, data),
  });
}

export async function POST(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") ?? "photo";
  if (type === "photo") {
    const form = await req.formData();
    const file = form.get("file");
    return mutate({
      auth: "user",
      bucket: "upload",
      handler: async ({ userId }) => {
        if (!(file instanceof File)) throw new AppError("INVALID", "Choose a photo.", 400);
        const photo = await addProfilePhoto(userId!, file);
        return {
          ...photo,
          src: `/api/media/${photo.mediumKey}`,
          thumb: `/api/media/${photo.thumbKey}`,
        };
      },
    });
  }
  if (type === "voice-intro") {
    const form = await req.formData();
    const file = form.get("file");
    const durationMs = Number(form.get("durationMs") ?? 0);
    return mutate({
      auth: "user",
      bucket: "upload",
      handler: async ({ userId }) => {
        if (!(file instanceof File)) throw new AppError("INVALID", "Record a 15 second intro.", 400);
        if (durationMs > 15_000) throw new AppError("INVALID", "Voice intros can be 15 seconds.", 400);
        const saved = await saveVoiceIntro(userId!, file);
        await prisma.profile.update({
          where: { userId: userId! },
          data: { voiceIntroKey: saved.mediaKey, voiceIntroMime: saved.mediaMime, voiceIntroMs: durationMs || 15000 },
        });
        return { src: `/api/media/${saved.mediaKey}`, durationMs };
      },
    });
  }
  const body = await req.json();
  if (type === "reorder") {
    return mutate({
      auth: "user",
      bucket: "profile",
      body,
      handler: ({ userId, data }) => {
        const payload = data as { photoIds: string[]; primaryId?: string };
        return reorderProfilePhotos(userId!, payload.photoIds, payload.primaryId);
      },
    });
  }
  if (type === "delete-photo") {
    return mutate({
      auth: "user",
      bucket: "profile",
      body,
      handler: ({ userId, data }) => removeProfilePhoto(userId!, (data as { photoId: string }).photoId),
    });
  }
  throw new AppError("INVALID", "Unknown profile action.", 400);
}
