import { NextRequest } from "next/server";
import { readStoredFile } from "@/server/storage/local";
import { prisma } from "@/server/db";
import { readSession } from "@/server/auth/session";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ key: string[] }> }) {
  const { key } = await ctx.params;
  const storageKey = key.join("/");
  if (storageKey.startsWith("chat/")) {
    const session = await readSession();
    if (!session) return new Response("Not available", { status: 401 });
    const { canAccessMedia } = await import("@/server/messaging/service");
    if (!(await canAccessMedia(session.userId, storageKey))) {
      return new Response("Not available", { status: 403 });
    }
  }
  const photo = await prisma.profilePhoto.findFirst({
    where: { OR: [{ storageKey }, { mediumKey: storageKey }, { thumbKey: storageKey }] },
  });
  if (photo && photo.status !== "APPROVED") {
    const session = await readSession();
    if (!session || session.user.profile?.id !== photo.profileId) {
      return new Response("Not available", { status: 403 });
    }
  }
  try {
    const file = await readStoredFile(storageKey);
    return new Response(file, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
