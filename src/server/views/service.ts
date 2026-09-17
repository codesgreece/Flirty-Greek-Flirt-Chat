import { prisma } from "@/server/db";
import { notify } from "@/server/notifications/service";
import { hasCapability } from "@/server/entitlements/engine";
import { CAPABILITIES } from "@/server/entitlements/catalog";
import { ageFromDob } from "@/lib/dates";

export async function recordProfileView(viewerId: string, subjectId: string) {
  if (viewerId === subjectId) return;
  const since = new Date(Date.now() - 18 * 60 * 60 * 1000);
  const recent = await prisma.profileView.findFirst({
    where: { viewerId, subjectId, createdAt: { gte: since } },
  });
  if (recent) return recent;
  const row = await prisma.profileView.create({ data: { viewerId, subjectId } });
  await notify({
    userId: subjectId,
    kind: "PROFILE_VIEW",
    title: "Someone viewed you",
    body: "Open Who viewed you to see who stopped on your profile.",
    payload: { viewerId },
  });
  return row;
}

export async function listProfileViews(userId: string) {
  const allowed = await hasCapability(userId, CAPABILITIES.SEE_WHO_LIKED);
  const rows = await prisma.profileView.findMany({
    where: { subjectId: userId, viewer: { status: "ACTIVE" } },
    include: {
      viewer: {
        include: {
          profile: {
            include: { photos: { where: { status: "APPROVED" }, take: 1, orderBy: { sortOrder: "asc" } } },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 60,
  });
  return {
    locked: !allowed,
    views: rows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt,
      blurred: !allowed,
      viewer: {
        id: row.viewerId,
        name: allowed ? (row.viewer.profile?.displayName ?? "Someone") : "Someone",
        age: allowed && row.viewer.profile ? ageFromDob(row.viewer.profile.dateOfBirth) : null,
        photo: allowed && row.viewer.profile?.photos[0]
          ? `/api/media/${row.viewer.profile.photos[0].thumbKey}`
          : null,
        city: allowed ? (row.viewer.profile?.city ?? "") : "",
      },
    })),
  };
}
