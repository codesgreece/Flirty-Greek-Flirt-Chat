import { NextRequest } from "next/server";
import { mutate } from "@/server/http";
import { saveOnboarding } from "@/server/onboarding/service";
import { prisma } from "@/server/db";

export async function POST(req: NextRequest) {
  const body = await req.json();
  return mutate({
    auth: "user",
    bucket: "profile",
    body,
    handler: ({ userId, data }) => saveOnboarding(userId!, data),
  });
}

export async function GET() {
  return mutate({
    auth: "user",
    csrf: false,
    handler: async () => {
      const [interests, vibes] = await Promise.all([
        prisma.interest.findMany({ orderBy: { label: "asc" } }),
        prisma.vibe.findMany({ orderBy: { label: "asc" } }),
      ]);
      return { interests, vibes };
    },
  });
}
