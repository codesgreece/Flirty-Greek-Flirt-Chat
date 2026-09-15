import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import { verifyPassword } from "@/server/auth/password";
import { audit } from "@/server/audit";
import { track } from "@/server/analytics";

export async function deleteAccount(userId: string, password: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await verifyPassword(user.passwordHash, password))) {
    throw new AppError("INVALID_CREDENTIALS", "Password confirmation failed.", 401);
  }
  await prisma.$transaction(async (tx) => {
    await tx.deviceSession.updateMany({ where: { userId }, data: { revokedAt: new Date() } });
    await tx.profilePhoto.deleteMany({ where: { profile: { userId } } });
    await tx.profile.updateMany({
      where: { userId },
      data: {
        displayName: "Deleted account",
        bio: "",
        prompts: [],
        city: "",
        country: "",
        latitude: null,
        longitude: null,
        discoverable: false,
        incognito: true,
      },
    });
    await tx.message.updateMany({
      where: { senderId: userId, deletedAt: null },
      data: { body: "This message was removed after account deletion.", deletedAt: new Date() },
    });
    await tx.directMessage.updateMany({
      where: { senderId: userId },
      data: { body: "[removed]" },
    });
    await tx.notification.deleteMany({ where: { userId } });
    await tx.user.update({
      where: { id: userId },
      data: {
        email: `deleted+${userId}@invalid.local`,
        emailNormalized: `deleted+${userId}@invalid.local`,
        passwordHash: "deleted",
        status: "DELETED",
        deletedAt: new Date(),
      },
    });
  });
  await audit({ action: "ACCOUNT_DELETED", userId });
  await track("account_deleted", userId);
}

export async function exportUserData(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      profile: { include: { photos: true } },
      interests: { include: { interest: true } },
      vibes: { include: { vibe: true } },
      privacy: true,
      notificationPrefs: true,
      subscription: { include: { plan: true } },
    },
  });
  const exportRow = await prisma.dataExport.create({
    data: { userId, status: "COMPLETE", completedAt: new Date() },
  });
  return {
    exportId: exportRow.id,
    generatedAt: new Date().toISOString(),
    user: {
      email: user.email,
      createdAt: user.createdAt,
      profile: user.profile,
      interests: user.interests.map((i) => i.interest.label),
      vibes: user.vibes.map((v) => v.vibe.label),
      privacy: user.privacy,
      notifications: user.notificationPrefs,
      plan: user.subscription?.plan.code ?? "FREE",
    },
  };
}
