import { NextRequest } from "next/server";
import { mutate } from "@/server/http";
import { discoverFeed, topPicks } from "@/server/discovery/engine";

export async function GET(req: NextRequest) {
  const cursor = req.nextUrl.searchParams.get("cursor") ?? undefined;
  const picks = req.nextUrl.searchParams.get("top") === "1";
  return mutate({
    auth: "user",
    csrf: false,
    handler: async ({ userId }) => {
      if (picks) return topPicks(userId!);
      return discoverFeed(userId!, cursor);
    },
  });
}
