import { NextRequest } from "next/server";
import { z } from "zod";
import { mutate } from "@/server/http";
import { blockUser, hideProfile, reportUser, unblockUser } from "@/server/safety/service";
import { prisma } from "@/server/db";
import { audit } from "@/server/audit";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const action = req.nextUrl.searchParams.get("action") ?? "report";
  if (action === "block") {
    return mutate({
      auth: "user",
      bucket: "report",
      schema: z.object({ userId: z.string().uuid() }),
      body,
      handler: async ({ userId, data }) => {
        await blockUser(userId!, (data as { userId: string }).userId);
        await audit({ action: "USER_BLOCKED", userId, metadata: { blocked: (data as { userId: string }).userId } });
        return { ok: true };
      },
    });
  }
  if (action === "unblock") {
    return mutate({
      auth: "user",
      schema: z.object({ userId: z.string().uuid() }),
      body,
      handler: async ({ userId, data }) => {
        await unblockUser(userId!, (data as { userId: string }).userId);
        return { ok: true };
      },
    });
  }
  if (action === "hide") {
    return mutate({
      auth: "user",
      schema: z.object({ userId: z.string().uuid() }),
      body,
      handler: ({ userId, data }) => hideProfile(userId!, (data as { userId: string }).userId),
    });
  }
  return mutate({
    auth: "user",
    bucket: "report",
    schema: z.object({
      reportedId: z.string().uuid(),
      category: z.enum(["FAKE_PROFILE", "HARASSMENT", "SPAM", "SCAM", "INAPPROPRIATE", "THREATS", "OTHER"]),
      details: z.string().max(1000).default(""),
      messageId: z.string().optional(),
    }),
    body,
      handler: async ({ userId, data }) => {
        const payload = data as {
          reportedId: string;
          category: "FAKE_PROFILE" | "HARASSMENT" | "SPAM" | "SCAM" | "INAPPROPRIATE" | "THREATS" | "OTHER";
          details: string;
          messageId?: string;
        };
        const result = await reportUser({ reporterId: userId!, ...payload });
        await audit({ action: "USER_REPORTED", userId, metadata: { category: payload.category } });
        return result;
      },
  });
}

export async function GET() {
  return mutate({
    auth: "user",
    csrf: false,
    handler: async ({ userId }) =>
      prisma.block.findMany({
        where: { blockerId: userId },
        include: { blocked: { include: { profile: true } } },
      }),
  });
}
