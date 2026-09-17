import { NextRequest } from "next/server";
import { z } from "zod";
import { mutate } from "@/server/http";
import { activateBoost, activatePlan, setIncognito, setPassport } from "@/server/subscriptions/service";
import { entitlementSnapshot } from "@/server/entitlements/engine";
import { usageSnapshot } from "@/server/usage/counters";
import { prisma } from "@/server/db";
import { findPassportCity, PASSPORT_CITIES } from "@/lib/cities";
import { AppError } from "@/server/errors";
import { getWallet } from "@/server/shop/service";

export async function GET() {
  return mutate({
    auth: "user",
    csrf: false,
    handler: async ({ userId }) => ({
      plans: await prisma.subscriptionPlan.findMany({ orderBy: { priceCents: "asc" } }),
      entitlements: await entitlementSnapshot(userId!),
      usage: await usageSnapshot(userId!),
      wallet: await getWallet(userId!),
      cities: PASSPORT_CITIES,
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
        city: z.string().optional(),
        clear: z.boolean().optional(),
        country: z.string().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
      }),
      body,
      handler: ({ userId, data }) => {
        const payload = data as {
          city?: string;
          clear?: boolean;
          country?: string;
          latitude?: number;
          longitude?: number;
        };
        if (payload.clear) return setPassport(userId!, null);
        const known = payload.city ? findPassportCity(payload.city) : null;
        const dest = known ?? (payload.city && payload.country && payload.latitude != null && payload.longitude != null
          ? { city: payload.city, country: payload.country, latitude: payload.latitude, longitude: payload.longitude }
          : null);
        if (!dest) throw new AppError("INVALID", "Pick a city from the list.", 400);
        return setPassport(userId!, dest);
      },
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
