import type { PlanCode } from "@prisma/client";
import { AppError } from "@/server/errors";
import { CAPABILITIES, PLAN_LIMITS, type Capability } from "@/server/entitlements/catalog";
import { prisma } from "@/server/db";

export async function planForUser(userId: string): Promise<PlanCode> {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    include: { plan: true },
  });
  if (!sub || sub.status !== "ACTIVE" || sub.expiresAt < new Date()) return "FREE";
  return sub.plan.code;
}

export async function hasCapability(userId: string, capability: Capability): Promise<boolean> {
  const override = await prisma.userEntitlement.findUnique({
    where: { userId_capability: { userId, capability } },
  });
  if (override) return override.enabled;
  const plan = await planForUser(userId);
  return PLAN_LIMITS[plan].capabilities.includes(capability);
}

export async function requireCapability(userId: string, capability: Capability, requiredPlan: PlanCode) {
  const ok = await hasCapability(userId, capability);
  if (!ok) {
    throw new AppError(
      "UPGRADE_REQUIRED",
      "This FLIRTY feature is part of a higher plan.",
      402,
      { capability, requiredPlan, currentPlan: await planForUser(userId) },
    );
  }
}

export async function entitlementSnapshot(userId: string) {
  const plan = await planForUser(userId);
  const limits = PLAN_LIMITS[plan];
  return {
    plan,
    limits,
    capabilities: Object.fromEntries(
      Object.values(CAPABILITIES).map((cap) => [cap, limits.capabilities.includes(cap)]),
    ) as Record<Capability, boolean>,
  };
}
