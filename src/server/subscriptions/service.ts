import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import { requireCapability } from "@/server/entitlements/engine";
import { CAPABILITIES } from "@/server/entitlements/catalog";
import { consumeUsage } from "@/server/usage/counters";
import { track } from "@/server/analytics";
import { audit } from "@/server/audit";
import { getEnv } from "@/lib/env";

export async function activatePlan(userId: string, code: "FREE" | "PLUS" | "GOLD" | "PLATINUM", idempotencyKey?: string) {
  if (idempotencyKey) {
    const hit = await prisma.idempotencyKey.findUnique({
      where: { userId_route_key: { userId, route: "subscribe", key: idempotencyKey } },
    });
    if (hit) return hit.response;
  }
  const env = getEnv();
  if (env.NODE_ENV === "production" && env.ENABLE_DEV_BILLING !== "true" && code !== "FREE") {
    throw new AppError(
      "BILLING_UNAVAILABLE",
      "Live card payments are not connected yet. Plans can be activated in development billing.",
      503,
    );
  }
  const plan = await prisma.subscriptionPlan.findUnique({ where: { code } });
  if (!plan) throw new AppError("NOT_FOUND", "That plan is unavailable.", 404);
  const expiresAt = new Date();
  expiresAt.setUTCMonth(expiresAt.getUTCMonth() + 1);
  const sub = await prisma.subscription.upsert({
    where: { userId },
    update: {
      planId: plan.id,
      status: "ACTIVE",
      startedAt: new Date(),
      expiresAt,
      provider: "development",
    },
    create: {
      userId,
      planId: plan.id,
      status: "ACTIVE",
      expiresAt,
      provider: "development",
    },
  });
  await prisma.billingLedger.create({
    data: {
      subscriptionId: sub.id,
      amountCents: plan.priceCents,
      kind: "ACTIVATION",
      note: `Development adapter activated ${code}`,
    },
  });
  await track("subscription_started", userId, { plan: code });
  await audit({ action: "SUBSCRIPTION_CHANGED", userId, metadata: { plan: code } });
  if (idempotencyKey) {
    await prisma.idempotencyKey.create({
      data: { userId, route: "subscribe", key: idempotencyKey, response: sub as object },
    });
  }
  return sub;
}

export async function activateBoost(userId: string, idempotencyKey?: string) {
  await requireCapability(userId, CAPABILITIES.BOOST, "GOLD");
  await consumeUsage(userId, "boosts");
  if (idempotencyKey) {
    const hit = await prisma.idempotencyKey.findUnique({
      where: { userId_route_key: { userId, route: "boost", key: idempotencyKey } },
    });
    if (hit) return hit.response;
  }
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await prisma.boost.updateMany({
    where: { userId, status: "ACTIVE" },
    data: { status: "EXPIRED" },
  });
  const boost = await prisma.boost.create({
    data: { userId, expiresAt, idempotencyKey },
  });
  await track("boost_activated", userId);
  if (idempotencyKey) {
    await prisma.idempotencyKey.create({
      data: { userId, route: "boost", key: idempotencyKey, response: boost as object },
    });
  }
  return boost;
}

export async function setPassport(
  userId: string,
  input: { city: string; country: string; latitude: number; longitude: number },
) {
  await requireCapability(userId, CAPABILITIES.PASSPORT, "PLUS");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const row = await prisma.passport.upsert({
    where: { userId },
    update: { ...input, active: true, expiresAt },
    create: { userId, ...input, active: true, expiresAt },
  });
  await track("passport_activated", userId, { city: input.city });
  return row;
}

export async function setIncognito(userId: string, incognito: boolean) {
  await requireCapability(userId, CAPABILITIES.INCOGNITO, "PLUS");
  return prisma.profile.update({ where: { userId }, data: { incognito } });
}
