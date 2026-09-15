import { NextRequest } from "next/server";
import { prisma } from "@/server/db";

export async function GET(req: NextRequest) {
  const enabled = await prisma.featureFlag.findMany();
  const requested = req.nextUrl.searchParams.get("key");
  if (requested) {
    const flag = enabled.find((f) => f.key === requested);
    return Response.json({ key: requested, enabled: flag?.enabled ?? false });
  }
  return Response.json({ flags: Object.fromEntries(enabled.map((f) => [f.key, f.enabled])) });
}
