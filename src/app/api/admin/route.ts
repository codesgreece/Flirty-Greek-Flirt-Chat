import { NextRequest } from "next/server";
import { z } from "zod";
import { mutate } from "@/server/http";
import {
  adminOverview,
  adminSearchUsers,
  reviewVerification,
  setFeatureFlag,
  setUserStatus,
} from "@/server/admin/service";
import { prisma } from "@/server/db";

export async function GET(req: NextRequest) {
  const section = req.nextUrl.searchParams.get("section") ?? "overview";
  const q = req.nextUrl.searchParams.get("q") ?? "";
  return mutate({
    auth: "admin",
    csrf: false,
    handler: async () => {
      if (section === "users") return adminSearchUsers(q || "");
      if (section === "reports") {
        return prisma.report.findMany({
          include: { reporter: { include: { profile: true } }, reported: { include: { profile: true } } },
          orderBy: { createdAt: "desc" },
          take: 80,
        });
      }
      if (section === "verification") {
        return prisma.verification.findMany({
          include: { user: { include: { profile: true } } },
          orderBy: { createdAt: "desc" },
          take: 80,
        });
      }
      if (section === "flags") return prisma.featureFlag.findMany();
      if (section === "audit") {
        return prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
      }
      if (section === "moderation") {
        return prisma.moderationCase.findMany({ include: { actions: true, subject: { include: { profile: true } } }, take: 80, orderBy: { createdAt: "desc" } });
      }
      if (section === "subscriptions") {
        return prisma.subscription.findMany({ include: { plan: true, user: { include: { profile: true } } }, take: 80 });
      }
      if (section === "analytics") {
        return prisma.analyticsEvent.groupBy({ by: ["name"], _count: true });
      }
      return adminOverview();
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const action = req.nextUrl.searchParams.get("action") ?? "status";
  if (action === "flag") {
    return mutate({
      auth: "admin",
      schema: z.object({ key: z.string(), enabled: z.boolean() }),
      body,
      handler: ({ data }) => setFeatureFlag((data as { key: string }).key, (data as { enabled: boolean }).enabled),
    });
  }
  if (action === "verify") {
    return mutate({
      auth: "admin",
      schema: z.object({ id: z.string().uuid(), status: z.enum(["VERIFIED", "REJECTED"]) }),
      body,
      handler: ({ userId, data }) =>
        reviewVerification(userId!, (data as { id: string }).id, (data as { status: "VERIFIED" | "REJECTED" }).status),
    });
  }
  return mutate({
    auth: "admin",
    schema: z.object({ userId: z.string().uuid(), status: z.enum(["ACTIVE", "SUSPENDED", "BANNED"]) }),
    body,
    handler: ({ userId, data }) =>
      setUserStatus(userId!, (data as { userId: string }).userId, (data as { status: "ACTIVE" | "SUSPENDED" | "BANNED" }).status),
  });
}
