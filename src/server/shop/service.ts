import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import { getEnv } from "@/lib/env";
import { findShopPack, SHOP_PACKS, type ShopPackId } from "@/lib/shop";
import { track } from "@/server/analytics";
import { audit } from "@/server/audit";

export type Wallet = {
  superLikes: number;
  firstMessages: number;
  boosts: number;
  spotlights: number;
};

async function wallet(userId: string) {
  return prisma.consumableBalance.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

export async function getWallet(userId: string): Promise<Wallet> {
  const row = await wallet(userId);
  return {
    superLikes: row.superLikes,
    firstMessages: row.firstMessages,
    boosts: row.boosts,
    spotlights: row.spotlights,
  };
}

export async function consumeWallet(
  userId: string,
  key: keyof Wallet,
): Promise<boolean> {
  const row = await wallet(userId);
  if (row[key] < 1) return false;
  await prisma.consumableBalance.update({
    where: { userId },
    data: { [key]: { decrement: 1 } },
  });
  return true;
}

export async function creditWallet(userId: string, grant: Wallet) {
  await wallet(userId);
  await prisma.consumableBalance.update({
    where: { userId },
    data: {
      superLikes: { increment: grant.superLikes },
      firstMessages: { increment: grant.firstMessages },
      boosts: { increment: grant.boosts },
      spotlights: { increment: grant.spotlights },
    },
  });
}

export async function activateSpotlight(userId: string) {
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await prisma.spotlight.updateMany({
    where: { userId, status: "ACTIVE" },
    data: { status: "EXPIRED" },
  });
  const row = await prisma.spotlight.create({ data: { userId, expiresAt } });
  await track("spotlight_activated", userId);
  return row;
}

export async function activateBoostFromWallet(userId: string) {
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await prisma.boost.updateMany({
    where: { userId, status: "ACTIVE" },
    data: { status: "EXPIRED" },
  });
  const boost = await prisma.boost.create({ data: { userId, expiresAt } });
  await track("boost_activated", userId, { source: "wallet" });
  return boost;
}

export async function purchasePack(userId: string, packId: ShopPackId, idempotencyKey?: string) {
  if (idempotencyKey) {
    const hit = await prisma.idempotencyKey.findUnique({
      where: { userId_route_key: { userId, route: "shop", key: idempotencyKey } },
    });
    if (hit) return hit.response;
  }
  const env = getEnv();
  if (env.NODE_ENV === "production" && env.ENABLE_DEV_BILLING !== "true") {
    throw new AppError(
      "BILLING_UNAVAILABLE",
      "Live card payments are not connected yet. Consumables can be bought in development billing.",
      503,
    );
  }
  const pack = findShopPack(packId);
  if (!pack) throw new AppError("NOT_FOUND", "That pack is unavailable.", 404);
  await creditWallet(userId, { ...pack.grant });
  let activated: { kind: string; expiresAt: Date } | null = null;
  if (pack.activate === "boost") {
    const used = await consumeWallet(userId, "boosts");
    if (used) {
      const boost = await activateBoostFromWallet(userId);
      activated = { kind: "boost", expiresAt: boost.expiresAt };
    }
  }
  if (pack.activate === "spotlight") {
    const used = await consumeWallet(userId, "spotlights");
    if (used) {
      const spotlight = await activateSpotlight(userId);
      activated = { kind: "spotlight", expiresAt: spotlight.expiresAt };
    }
  }
  const result = { pack: pack.id, wallet: await getWallet(userId), activated };
  await audit({ action: "SHOP_PURCHASE", userId, metadata: { pack: pack.id, cents: pack.priceCents } });
  await track("shop_purchase", userId, { pack: pack.id });
  if (idempotencyKey) {
    await prisma.idempotencyKey.create({
      data: { userId, route: "shop", key: idempotencyKey, response: result as object },
    });
  }
  return result;
}

export function catalog() {
  return SHOP_PACKS;
}
