import { NextRequest } from "next/server";
import { mutate } from "@/server/http";
import { listProfileViews, recordProfileView } from "@/server/views/service";
import { z } from "zod";

export async function GET() {
  return mutate({
    auth: "user",
    csrf: false,
    handler: ({ userId }) => listProfileViews(userId!),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  return mutate({
    auth: "user",
    schema: z.object({ subjectId: z.string().uuid() }),
    body,
    handler: ({ userId, data }) => recordProfileView(userId!, (data as { subjectId: string }).subjectId),
  });
}
