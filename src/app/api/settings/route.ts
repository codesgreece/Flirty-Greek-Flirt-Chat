import { NextRequest } from "next/server";
import { z } from "zod";
import { mutate } from "@/server/http";
import { listNotifications, markRead } from "@/server/notifications/service";
import { prisma } from "@/server/db";
import { saveProfilePhoto } from "@/server/storage/local";
import { deleteAccount, exportUserData } from "@/server/users/deletion";
import { changePassword } from "@/server/auth/service";
import { AppError } from "@/server/errors";
import { submitSelfieVerification, requestPhoneCode, confirmPhoneCode } from "@/server/verify/service";
import { shareMyDate, listDateShares } from "@/server/dateshare/service";
import { dailyVibeFor } from "@/lib/daily-vibe";

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") ?? "notifications";
  return mutate({
    auth: "user",
    csrf: false,
    handler: async ({ userId }) => {
      if (type === "export") return exportUserData(userId!);
      if (type === "date-share") return listDateShares(userId!);
      if (type === "daily-vibe") return { question: dailyVibeFor() };
      return listNotifications(userId!);
    },
  });
}

export async function POST(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type");
  if (type === "photo") {
    const form = await req.formData();
    const file = form.get("file");
    return mutate({
      auth: "user",
      bucket: "upload",
      handler: async ({ userId }) => {
        const profile = await prisma.profile.findUnique({ where: { userId } });
        if (!profile) throw new AppError("INVALID", "Finish onboarding first.", 400);
        if (!(file instanceof File)) throw new AppError("INVALID", "Choose a photo.", 400);
        return saveProfilePhoto(profile.id, file);
      },
    });
  }
  if (type === "selfie") {
    const form = await req.formData();
    const file = form.get("file");
    return mutate({
      auth: "user",
      bucket: "verification",
      handler: async ({ userId }) => {
        if (!(file instanceof File)) throw new AppError("INVALID", "Upload a selfie to verify.", 400);
        return submitSelfieVerification(userId!, file);
      },
    });
  }
  const body = await req.json();
  if (type === "privacy") {
    return mutate({
      auth: "user",
      schema: z.object({
        showDistance: z.boolean().optional(),
        showOnline: z.boolean().optional(),
        discoveryVisible: z.boolean().optional(),
        profileVisibility: z.string().optional(),
        messagePermissions: z.string().optional(),
        cookieAnalytics: z.boolean().optional(),
        cookieMarketing: z.boolean().optional(),
      }),
      body,
      handler: async ({ userId, data }) => {
        const privacy = await prisma.privacySettings.upsert({
          where: { userId: userId! },
          update: data as object,
          create: { userId: userId!, ...(data as object) },
        });
        await prisma.profile.update({
          where: { userId: userId! },
          data: {
            showDistance: privacy.showDistance,
            showOnline: privacy.showOnline,
            discoverable: privacy.discoveryVisible,
          },
        });
        return privacy;
      },
    });
  }
  if (type === "notifications") {
    return mutate({
      auth: "user",
      body,
      handler: ({ userId, data }) =>
        prisma.notificationPreference.upsert({
          where: { userId: userId! },
          update: data as object,
          create: { userId: userId!, ...(data as object) },
        }),
    });
  }
  if (type === "password") {
    return mutate({
      auth: "user",
      schema: z.object({ current: z.string(), next: z.string().min(10) }),
      body,
      handler: ({ userId, data }) =>
        changePassword(userId!, (data as { current: string }).current, (data as { next: string }).next),
    });
  }
  if (type === "delete") {
    return mutate({
      auth: "user",
      schema: z.object({ password: z.string(), confirm: z.literal("DELETE") }),
      body,
      handler: ({ userId, data }) => deleteAccount(userId!, (data as { password: string }).password),
    });
  }
  if (type === "verify") {
    return mutate({
      auth: "user",
      bucket: "verification",
      handler: async () => {
        throw new AppError("INVALID", "Upload a selfie to start verification.", 400);
      },
    });
  }
  if (type === "phone") {
    return mutate({
      auth: "user",
      schema: z.object({ phone: z.string().min(8).max(20) }),
      body,
      handler: ({ userId, data }) => requestPhoneCode(userId!, (data as { phone: string }).phone),
    });
  }
  if (type === "phone-confirm") {
    return mutate({
      auth: "user",
      schema: z.object({ code: z.string().min(4).max(8) }),
      body,
      handler: ({ userId, data }) => confirmPhoneCode(userId!, (data as { code: string }).code),
    });
  }
  if (type === "date-share") {
    return mutate({
      auth: "user",
      schema: z.object({
        otherName: z.string().min(1).max(80),
        whenText: z.string().min(1).max(80),
        area: z.string().min(1).max(80),
      }),
      body,
      handler: ({ userId, data }) =>
        shareMyDate(userId!, data as { otherName: string; whenText: string; area: string }),
    });
  }
  if (type === "hide-contacts") {
    return mutate({
      auth: "user",
      schema: z.object({ hideFromContacts: z.boolean() }),
      body,
      handler: async ({ userId, data }) => {
        await prisma.profile.update({
          where: { userId: userId! },
          data: { hideFromContacts: (data as { hideFromContacts: boolean }).hideFromContacts },
        });
        return { hideFromContacts: (data as { hideFromContacts: boolean }).hideFromContacts };
      },
    });
  }
  return mutate({
    auth: "user",
    schema: z.object({ id: z.string().uuid().optional() }),
    body,
    handler: ({ userId, data }) => markRead(userId!, (data as { id?: string }).id),
  });
}
