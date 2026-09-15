import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";

export async function areBlocked(a: string, b: string) {
  const row = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
  });
  return Boolean(row);
}

export async function assertNotBlocked(a: string, b: string) {
  if (a === b) throw new AppError("INVALID", "You cannot do that to yourself.", 400);
  if (await areBlocked(a, b)) {
    throw new AppError("BLOCKED", "This connection is not available.", 403);
  }
}

export async function blockUser(blockerId: string, blockedId: string) {
  await assertNotBlocked(blockerId, blockedId);
  await prisma.$transaction(async (tx) => {
    await tx.block.create({ data: { blockerId, blockedId } });
    await tx.match.updateMany({
      where: {
        active: true,
        OR: [
          { lowUserId: blockerId, highUserId: blockedId },
          { lowUserId: blockedId, highUserId: blockerId },
        ],
      },
      data: { active: false, unmatchedAt: new Date(), unmatchedBy: blockerId },
    });
    await tx.interaction.updateMany({
      where: {
        active: true,
        OR: [
          { actorId: blockerId, targetId: blockedId },
          { actorId: blockedId, targetId: blockerId },
        ],
      },
      data: { active: false },
    });
  });
}

export async function unblockUser(blockerId: string, blockedId: string) {
  await prisma.block.deleteMany({ where: { blockerId, blockedId } });
}

export async function hideProfile(userId: string, hiddenId: string) {
  await prisma.hiddenProfile.upsert({
    where: { userId_hiddenId: { userId, hiddenId } },
    update: {},
    create: { userId, hiddenId },
  });
}

export async function reportUser(input: {
  reporterId: string;
  reportedId: string;
  category: "FAKE_PROFILE" | "HARASSMENT" | "SPAM" | "SCAM" | "INAPPROPRIATE" | "THREATS" | "OTHER";
  details: string;
  messageId?: string;
}) {
  if (input.reporterId === input.reportedId) {
    throw new AppError("INVALID", "You cannot report yourself.", 400);
  }
  const report = await prisma.report.create({ data: input });
  await prisma.moderationCase.create({
    data: {
      subjectId: input.reportedId,
      kind: "USER_REPORT",
      reason: input.category,
    },
  });
  return report;
}
