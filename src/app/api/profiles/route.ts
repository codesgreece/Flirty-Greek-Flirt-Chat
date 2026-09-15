import { NextRequest } from "next/server";
import { mutate } from "@/server/http";
import { getCompatibility } from "@/server/compatibility/service";
import { prisma } from "@/server/db";
import { ageFromDob } from "@/lib/dates";
import { AppError } from "@/server/errors";

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
          photos: { where: { status: "APPROVED" }, orderBy: { sortOrder: "asc" } },
          user: { include: { interests: { include: { interest: true } }, vibes: { include: { vibe: true } } } },
        },
      });
      if (!profile) throw new AppError("NOT_FOUND", "Profile unavailable.", 404);
      const compat = await getCompatibility(viewerId!, userId);
      return {
        userId,
        name: profile.displayName,
        age: ageFromDob(profile.dateOfBirth),
        verified: profile.verificationStatus === "VERIFIED",
        bio: profile.bio,
        city: profile.city,
        intention: profile.datingIntention,
        prompts: profile.prompts,
        interests: profile.user.interests.map((i) => i.interest.label),
        vibes: profile.user.vibes.map((v) => v.vibe.label),
        photos: profile.photos.map((p) => ({ id: p.id, src: `/api/media/${p.mediumKey}` })),
        compatibility: compat,
      };
    },
  });
}
