import { NextRequest } from "next/server";
import { z } from "zod";
import { mutate } from "@/server/http";
import { catalog, getWallet, purchasePack } from "@/server/shop/service";
import { activateSpotlight, consumeWallet } from "@/server/shop/service";

export async function GET() {
  return mutate({
    auth: "user",
    csrf: false,
    handler: async ({ userId }) => ({
      packs: catalog(),
      wallet: await getWallet(userId!),
    }),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const action = req.nextUrl.searchParams.get("action") ?? "buy";
  if (action === "spotlight") {
    return mutate({
      auth: "user",
      handler: async ({ userId }) => {
        const used = await consumeWallet(userId!, "spotlights");
        if (!used) {
          const bought = await purchasePack(userId!, "spotlight_30");
          return bought;
        }
        return { activated: { kind: "spotlight", expiresAt: (await activateSpotlight(userId!)).expiresAt } };
      },
    });
  }
  return mutate({
    auth: "user",
    schema: z.object({
      packId: z.enum(["super_likes_5", "boost_now", "first_message", "spotlight_30"]),
      idempotencyKey: z.string().optional(),
    }),
    body,
    handler: ({ userId, data }) =>
      purchasePack(
        userId!,
        (data as { packId: "super_likes_5" | "boost_now" | "first_message" | "spotlight_30" }).packId,
        (data as { idempotencyKey?: string }).idempotencyKey,
      ),
  });
}
