import { prisma } from "@/server/db";
import { NotificationKind, type Prisma } from "@prisma/client";
import { getRedis } from "@/server/redis";

export async function notify(input: {
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  payload?: Prisma.InputJsonObject;
}) {
  const prefs = await prisma.notificationPreference.findUnique({ where: { userId: input.userId } });
  if (prefs) {
    if (input.kind === "LIKE" && !prefs.likes) return;
    if ((input.kind === "FLIRT" || input.kind === "SUPER_LIKE") && !prefs.flirts) return;
    if (input.kind === "MATCH" && !prefs.matches) return;
    if ((input.kind === "MESSAGE" || input.kind === "DIRECT_MESSAGE") && !prefs.messages) return;
  }
  const row = await prisma.notification.create({
    data: {
      userId: input.userId,
      kind: input.kind,
      title: input.title,
      body: input.body,
      payload: input.payload ?? {},
    },
  });
  await getRedis().set(`notify:${input.userId}:latest`, JSON.stringify(row), "EX", 60);
  return row;
}

export async function listNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function markRead(userId: string, id?: string) {
  await prisma.notification.updateMany({
    where: { userId, id: id ?? undefined, readAt: null },
    data: { readAt: new Date() },
  });
}
