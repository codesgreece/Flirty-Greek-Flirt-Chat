import type { InteractionKind } from "@prisma/client";
import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import { assertNotBlocked } from "@/server/safety/service";
import { consumeUsage } from "@/server/usage/counters";
import { requireCapability, hasCapability } from "@/server/entitlements/engine";
import { CAPABILITIES } from "@/server/entitlements/catalog";
import { createMatchIfMutual } from "@/server/matching/service";
import { notify } from "@/server/notifications/service";
import { track } from "@/server/analytics";
import { getRedis } from "@/server/redis";

function pair(a: string, b: string) {
  return a < b ? [a, b] : [b, a];
}

export async function recordInteraction(input: {
  actorId: string;
  targetId: string;
  kind: InteractionKind;
  idempotencyKey?: string;
}) {
  await assertNotBlocked(input.actorId, input.targetId);
  if (input.idempotencyKey) {
    const existing = await prisma.idempotencyKey.findUnique({
      where: {
        userId_route_key: { userId: input.actorId, route: `interact:${input.kind}`, key: input.idempotencyKey },
      },
    });
    if (existing) return existing.response as Record<string, unknown>;
  }

  if (input.kind === "FLIRT") await consumeUsage(input.actorId, "flirts");
  if (input.kind === "LIKE") await consumeUsage(input.actorId, "likes");
  if (input.kind === "SUPER_LIKE") {
    await requireCapability(input.actorId, CAPABILITIES.SUPER_LIKES, "PLUS");
    await consumeUsage(input.actorId, "super_likes");
  }

  const already = await prisma.interaction.findFirst({
    where: { actorId: input.actorId, targetId: input.targetId, kind: input.kind, active: true },
  });
  if (already) {
    return { duplicate: true, match: null, interactionId: already.id };
  }

  const interaction = await prisma.interaction.create({
    data: {
      actorId: input.actorId,
      targetId: input.targetId,
      kind: input.kind,
      idempotencyKey: input.idempotencyKey,
    },
  });

  await getRedis().sadd(`seen:${input.actorId}`, input.targetId);

  let match = null;
  if (input.kind !== "PASS") {
    match = await createMatchIfMutual(input.actorId, input.targetId, input.kind);
    const kindMap = {
      LIKE: "LIKE",
      FLIRT: "FLIRT",
      SUPER_LIKE: "SUPER_LIKE",
    } as const;
    await notify({
      userId: input.targetId,
      kind: kindMap[input.kind],
      title: input.kind === "SUPER_LIKE" ? "Someone Super Liked you" : "Someone sent a Flirt",
      body: "Open FLIRTY to see who it is.",
      payload: { actorId: input.actorId },
    });
    await track(
      input.kind === "SUPER_LIKE" ? "super_like_sent" : input.kind === "FLIRT" ? "flirt_sent" : "like_sent",
      input.actorId,
      { target: "profile" },
    );
  }

  const result = { duplicate: false, match, interactionId: interaction.id };
  if (input.idempotencyKey) {
    await prisma.idempotencyKey.create({
      data: {
        userId: input.actorId,
        route: `interact:${input.kind}`,
        key: input.idempotencyKey,
        response: result,
      },
    });
  }
  return result;
}

export async function rewindLast(userId: string) {
  await consumeUsage(userId, "rewinds");
  const last = await prisma.interaction.findFirst({
    where: { actorId: userId, rewindable: true, undoneAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!last) throw new AppError("NOTHING_TO_REWIND", "There is nothing to rewind yet.", 400);
  await prisma.interaction.update({
    where: { id: last.id },
    data: { active: false, rewindable: false, undoneAt: new Date() },
  });
  if (last.kind !== "PASS") {
    const [low, high] = pair(userId, last.targetId);
    await prisma.match.updateMany({
      where: { lowUserId: low, highUserId: high, active: true },
      data: { active: false, unmatchedAt: new Date(), unmatchedBy: userId },
    });
  }
  return last;
}

export async function likesYou(userId: string) {
  const allowed = await hasCapability(userId, CAPABILITIES.SEE_WHO_LIKED);
  const rows = await prisma.interaction.findMany({
    where: {
      targetId: userId,
      active: true,
      kind: { in: ["LIKE", "FLIRT", "SUPER_LIKE"] },
      actor: { status: "ACTIVE" },
    },
    include: {
      actor: { include: { profile: { include: { photos: { where: { status: "APPROVED" }, orderBy: { sortOrder: "asc" } } } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 60,
  });
  const outgoing = await prisma.interaction.findMany({
    where: { actorId: userId, targetId: { in: rows.map((r) => r.actorId) }, active: true },
  });
  const already = new Set(outgoing.map((row) => `${row.targetId}:${row.kind}`));
  return rows
    .filter((row) => !already.has(`${row.actorId}:FLIRT`) && !already.has(`${row.actorId}:PASS`))
    .map((row) => ({
      ...row,
      blurred: !allowed,
    }));
}

export { CAPABILITIES };
