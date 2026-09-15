import { NextRequest } from "next/server";
import { loginSchema, loginUser, registerSchema, registerUser } from "@/server/auth/service";
import { mutate, clientMeta } from "@/server/http";
import { readSession, clearSessionCookie } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { sha256 } from "@/lib/crypto";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/server/auth/session";
import { logoutUser } from "@/server/auth/service";
import { entitlementSnapshot } from "@/server/entitlements/engine";
import { usageSnapshot } from "@/server/usage/counters";
import { ageFromDob } from "@/lib/dates";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const meta = await clientMeta();
  const action = new URL(req.url).searchParams.get("action") ?? "login";
  if (action === "register") {
    return mutate({
      auth: "public",
      bucket: "register",
      schema: registerSchema,
      body,
      handler: ({ data }) => registerUser(registerSchema.parse(data), meta),
    });
  }
  if (action === "logout") {
    return mutate({
      auth: "user",
      handler: async ({ userId }) => {
        const token = (await cookies()).get(SESSION_COOKIE)?.value;
        if (token && userId) await logoutUser(sha256(token), userId);
        await clearSessionCookie();
        return { ok: true };
      },
    });
  }
  return mutate({
    auth: "public",
    bucket: "login",
    schema: loginSchema,
    body,
    handler: async ({ data }) => {
      const result = await loginUser(loginSchema.parse(data), meta);
      const profile = await prisma.profile.findUnique({ where: { userId: result.userId } });
      return { ...result, onboardingComplete: Boolean(profile?.onboardingCompletedAt) };
    },
  });
}

export async function GET() {
  const session = await readSession();
  if (!session) return Response.json({ user: null });
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.userId },
    include: {
      profile: { include: { photos: { orderBy: { sortOrder: "asc" } } } },
      interests: { include: { interest: true } },
      vibes: { include: { vibe: true } },
      preference: true,
      adminProfile: true,
      boosts: { where: { status: "ACTIVE", expiresAt: { gt: new Date() } } },
      passport: true,
      privacy: true,
      notificationPrefs: true,
    },
  });
  const [entitlements, usage] = await Promise.all([
    entitlementSnapshot(user.id),
    usageSnapshot(user.id),
  ]);
  return Response.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      isAdmin: Boolean(user.adminProfile) || user.role === "ADMIN",
      onboardingComplete: Boolean(user.profile?.onboardingCompletedAt),
      onboardingStep: user.profile?.onboardingStep ?? 0,
      profile: user.profile
        ? {
            name: user.profile.displayName,
            age: ageFromDob(user.profile.dateOfBirth),
            verified: user.profile.verificationStatus === "VERIFIED",
            verificationStatus: user.profile.verificationStatus,
            bio: user.profile.bio,
            city: user.profile.city,
            intention: user.profile.datingIntention,
            gender: user.profile.gender,
            seeking: user.profile.seeking,
            photos: user.profile.photos.map((p) => ({
              id: p.id,
              src: `/api/media/${p.mediumKey}`,
              status: p.status,
            })),
            interests: user.interests.map((i) => i.interest.label),
            vibes: user.vibes.map((v) => v.vibe.label),
            prompts: user.profile.prompts,
            incognito: user.profile.incognito,
            discoverable: user.profile.discoverable,
          }
        : null,
      entitlements,
      usage,
      boost: user.boosts[0] ?? null,
      passport: user.passport,
      privacy: user.privacy,
      notificationPrefs: user.notificationPrefs,
    },
  });
}
