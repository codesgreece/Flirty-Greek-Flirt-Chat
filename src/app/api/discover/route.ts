import { NextRequest } from "next/server";
import { mutate } from "@/server/http";
import { discoverFeed, topPicks, recordSignal } from "@/server/discovery/engine";
import { z } from "zod";

export const preferredRegion = ["fra1"];

export async function GET(req: NextRequest) {
  const cursor = req.nextUrl.searchParams.get("cursor") ?? undefined;
  const picks = req.nextUrl.searchParams.get("top") === "1";
  const room = req.nextUrl.searchParams.get("room") ?? undefined;
  return mutate({
    auth: "user",
    csrf: false,
    handler: async ({ userId }) => {
      if (picks) return topPicks(userId!);
      return discoverFeed(userId!, { cursor, room });
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  return mutate({
    auth: "user",
    schema: z.object({
      subjectId: z.string().uuid(),
      kind: z.enum(["MORE", "LESS"]),
    }),
    body,
    handler: ({ userId, data }) =>
      recordSignal(userId!, (data as { subjectId: string }).subjectId, (data as { kind: "MORE" | "LESS" }).kind),
  });
}
