import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";

export async function audit(input: {
  action: string;
  userId?: string | null;
  actorId?: string | null;
  metadata?: Prisma.InputJsonObject;
  ipHash?: string;
}) {
  await prisma.auditLog.create({
    data: {
      action: input.action,
      userId: input.userId ?? null,
      actorId: input.actorId ?? null,
      metadata: input.metadata ?? {},
      ipHash: input.ipHash ?? "",
    },
  });
}
