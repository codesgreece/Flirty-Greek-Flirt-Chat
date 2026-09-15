import { NextRequest } from "next/server";
import { z } from "zod";
import { mutate } from "@/server/http";
import { activateBoost, activatePlan, setIncognito, setPassport } from "@/server/subscriptions/service";
import { entitlementSnapshot } from "@/server/entitlements/engine";
import { usageSnapshot } from "@/server/usage/counters";
import { prisma } from "@/server/db";

export async function GET() {
  return mutate({
    auth: "user",
    csrf: false,
    handler: async ({ userId }) => ({
      plans: await prisma.subscriptionPlan.findMany({ orderBy: { priceCents: "asc" } }),
      entitlements: await entitlementSnapshot(userId!),
      usage: await usageSnapshot(userId!),
    }),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const action = req.nextUrl.searchParams.get("action") ?? "subscribe";
  if (action === "boost") {
    return mutate({
      auth: "user",
      schema: z.object({ idempotencyKey: z.string().optional() }),
      body,
      handler: ({ userId, data }) => activateBoost(userId!, (data as { idempotencyKey?: string }).idempotencyKey),
    });
  }
  if (action === "passport") {
    return mutate({
      auth: "user",
      schema: z.object({
        city: z.string(),
        country: z.string(),
        latitude: z.number(),
        longitude: z.number(),
      }),
      body,
      handler: ({ userId, data }) => setPassport(userId!, data as never),
    });
  }
  if (action === "incognito") {
    return mutate({
      auth: "user",
      schema: z.object({ incognito: z.boolean() }),
      body,
      handler: ({ userId, data }) => setIncognito(userId!, (data as { incognito: boolean }).incognito),
    });
  }
  return mutate({
    auth: "user",
    schema: z.object({
      plan: z.enum(["FREE", "PLUS", "GOLD", "PLATINUM"]),
      idempotencyKey: z.string().optional(),
    }),
    body,
    handler: ({ userId, data }) =>
      activatePlan(userId!, (data as { plan: "FREE" | "PLUS" | "GOLD" | "PLATINUM" }).plan, (data as { idempotencyKey?: string }).idempotencyKey),
  });
}
