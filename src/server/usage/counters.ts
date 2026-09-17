import { prisma } from "@/server/db";
import { periodKey } from "@/lib/dates";
import { AppError } from "@/server/errors";
import { PLAN_LIMITS } from "@/server/entitlements/catalog";
import { planForUser } from "@/server/entitlements/engine";

type CounterKey = "likes" | "flirts" | "rewinds" | "super_likes" | "direct_messages" | "boosts";

function periodFor(key: CounterKey) {
  if (key === "super_likes") return periodKey("week");
  if (key === "boosts") return periodKey("month");
  return periodKey("day");
}

function limitFor(plan: keyof typeof PLAN_LIMITS, key: CounterKey): number | null {
  const limits = PLAN_LIMITS[plan];
  switch (key) {
    case "likes":
      return limits.likesPerDay;
    case "flirts":
      return limits.flirtsPerDay;
    case "rewinds":
      return limits.rewindsPerDay;
    case "super_likes":
      return limits.superLikesPerWeek;
    case "direct_messages":
      return limits.directMessagesPerDay;
    case "boosts":
      return limits.boostsPerMonth;
  }
}

export async function readUsage(userId: string, key: CounterKey) {
  const row = await prisma.usageCounter.findUnique({
    where: { userId_key_periodKey: { userId, key, periodKey: periodFor(key) } },
  });
  return row?.count ?? 0;
}

export async function consumeUsage(userId: string, key: CounterKey) {
  const plan = await planForUser(userId);
  const limit = limitFor(plan, key);
  if (limit === null) return { remaining: null as number | null, used: await readUsage(userId, key) };
  if (limit === 0) {
    throw new AppError("UPGRADE_REQUIRED", "This action needs a higher FLIRTY plan.", 402, {
      key,
      currentPlan: plan,
    });
  }
  const period = periodFor(key);
  const row = await prisma.usageCounter.upsert({
    where: { userId_key_periodKey: { userId, key, periodKey: period } },
    update: { count: { increment: 1 } },
    create: { userId, key, periodKey: period, count: 1 },
  });
  if (row.count > limit) {
    await prisma.usageCounter.update({
      where: { id: row.id },
      data: { count: { decrement: 1 } },
    });
    throw new AppError("LIMIT_REACHED", "You've used this for now. Come back later or upgrade.", 429, {
      key,
      limit,
      currentPlan: plan,
    });
  }
  return { remaining: limit - row.count, used: row.count };
}

const USAGE_KEYS: CounterKey[] = ["likes", "flirts", "rewinds", "super_likes", "direct_messages", "boosts"];

export async function usageSnapshot(userId: string, plan?: Awaited<ReturnType<typeof planForUser>>) {
  const periods = [...new Set(USAGE_KEYS.map(periodFor))];
  const [resolved, rows] = await Promise.all([
    plan ? Promise.resolve(plan) : planForUser(userId),
    prisma.usageCounter.findMany({
      where: { userId, periodKey: { in: periods } },
      select: { key: true, periodKey: true, count: true },
    }),
  ]);
  const used = new Map(rows.map((row) => [`${row.key}:${row.periodKey}`, row.count]));
  return Object.fromEntries(
    USAGE_KEYS.map((key) => [
      key,
      { used: used.get(`${key}:${periodFor(key)}`) ?? 0, limit: limitFor(resolved, key) },
    ]),
  );
}
