import { NextRequest } from "next/server";
import { z } from "zod";
import { mutate } from "@/server/http";
import { likesYou, recordInteraction, rewindLast } from "@/server/flirts/service";

const schema = z.object({
  targetId: z.string().uuid(),
  kind: z.enum(["LIKE", "FLIRT", "SUPER_LIKE", "PASS"]),
  idempotencyKey: z.string().min(8).max(80).optional(),
  focusType: z.enum(["photo", "prompt", "vibe"]).optional(),
  focusLabel: z.string().max(80).optional(),
  photoId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  return mutate({
    auth: "user",
    bucket: "flirt",
    schema,
    body,
    handler: ({ userId, data }) => recordInteraction({ actorId: userId!, ...schema.parse(data) }),
  });
}

export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get("view");
  return mutate({
    auth: "user",
    csrf: false,
    handler: ({ userId }) => (action === "incoming" ? likesYou(userId!) : likesYou(userId!)),
  });
}

export async function PUT() {
  return mutate({
    auth: "user",
    bucket: "flirt",
    handler: ({ userId }) => rewindLast(userId!),
  });
}
