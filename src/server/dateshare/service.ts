import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";

export async function shareMyDate(
  userId: string,
  input: { otherName: string; whenText: string; area: string },
) {
  const otherName = input.otherName.trim();
  const whenText = input.whenText.trim();
  const area = input.area.trim();
  if (!otherName || !whenText || !area) {
    throw new AppError("INVALID", "Name, time and area are required. Exact GPS is never sent.", 400);
  }
  if (otherName.length > 80 || whenText.length > 80 || area.length > 80) {
    throw new AppError("INVALID", "Keep date-share details short.", 400);
  }
  const row = await prisma.dateShare.create({
    data: { userId, otherName, whenText, area },
  });
  const text = `I'm meeting ${otherName} around ${whenText} in ${area}. I'll check in after.`;
  return { ...row, text };
}

export async function listDateShares(userId: string) {
  return prisma.dateShare.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}
