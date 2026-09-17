import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import { audit } from "@/server/audit";

export async function adminOverview() {
  const [users, active, flirts, matches, messages, reports, pendingVerifications, plans, ledger] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { lastActiveAt: { gt: new Date(Date.now() - 86400_000) } } }),
    prisma.interaction.count({ where: { kind: "FLIRT", createdAt: { gt: new Date(Date.now() - 86400_000) } } }),
    prisma.match.count({ where: { active: true } }),
    prisma.message.count({ where: { createdAt: { gt: new Date(Date.now() - 86400_000) } } }),
    prisma.report.count({ where: { status: "OPEN" } }),
    prisma.verification.count({ where: { status: "PENDING" } }),
    prisma.subscription.groupBy({ by: ["planId"], _count: true }),
    prisma.billingLedger.aggregate({ _sum: { amountCents: true } }),
  ]);
  return {
    users,
    active,
    flirts,
    matches,
    messages,
    reports,
    pendingVerifications,
    subscriptions: plans,
    revenueCents: ledger._sum.amountCents ?? 0,
  };
}

export async function adminSearchUsers(q: string) {
  return prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: q, mode: "insensitive" } },
        { profile: { displayName: { contains: q, mode: "insensitive" } } },
      ],
    },
    include: { profile: true, subscription: { include: { plan: true } }, adminProfile: true },
    take: 40,
  });
}

export async function setUserStatus(adminId: string, userId: string, status: "ACTIVE" | "SUSPENDED" | "BANNED") {
  await prisma.user.update({ where: { id: userId }, data: { status } });
  if (status !== "ACTIVE") {
    await prisma.deviceSession.updateMany({ where: { userId }, data: { revokedAt: new Date() } });
  }
  await audit({ action: "ADMIN_ACTION", actorId: adminId, userId, metadata: { status } });
}

export async function reviewVerification(adminId: string, verificationId: string, status: "VERIFIED" | "REJECTED") {
  const row = await prisma.verification.update({
    where: { id: verificationId },
    data: { status, reviewedAt: new Date(), reviewerId: adminId },
  });
  await prisma.profile.update({
    where: { userId: row.userId },
    data: { verificationStatus: status },
  });
  await audit({ action: "ADMIN_ACTION", actorId: adminId, userId: row.userId, metadata: { verification: status } });
}

export async function setFeatureFlag(key: string, enabled: boolean) {
  return prisma.featureFlag.upsert({
    where: { key },
    update: { enabled },
    create: { key, enabled },
  });
}

export async function requireAdminRole(userId: string) {
  const admin = await prisma.adminUser.findUnique({ where: { userId } });
  if (!admin) throw new AppError("FORBIDDEN", "Admin access required.", 403);
  return admin;
}
