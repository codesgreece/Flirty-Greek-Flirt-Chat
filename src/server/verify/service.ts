import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import { getRedis } from "@/server/redis";
import { sha256, timingSafeEqual } from "@/lib/crypto";
import { getEnv } from "@/lib/env";
import { saveProfilePhoto } from "@/server/storage/local";

function phoneKey(userId: string) {
  return `phone-code:${userId}`;
}

export function isSelfieVerified(profile: {
  verificationStatus: string;
  user?: { verifications?: { status: string; selfieKey: string | null }[] };
}) {
  if (profile.verificationStatus !== "VERIFIED") return false;
  const rows = profile.user?.verifications;
  if (!rows) return true;
  return rows.some((row) => row.status === "VERIFIED" && Boolean(row.selfieKey));
}

export async function submitSelfieVerification(userId: string, file: File) {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) throw new AppError("INVALID", "Finish onboarding first.", 400);
  const photo = await saveProfilePhoto(profile.id, file);
  const row = await prisma.verification.create({
    data: {
      userId,
      status: "PENDING",
      selfieKey: photo.storageKey,
      note: "selfie",
    },
  });
  await prisma.profile.update({
    where: { userId },
    data: { verificationStatus: "PENDING" },
  });
  return { status: row.status, verificationId: row.id };
}

export async function requestPhoneCode(userId: string, phone: string) {
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.length < 8) throw new AppError("INVALID", "Enter a valid phone number.", 400);
  const code = String(Math.floor(100000 + Math.random() * 900000));
  await getRedis().set(phoneKey(userId), JSON.stringify({ hash: sha256(code), phone: digits }), "EX", 600);
  await prisma.profile.update({ where: { userId }, data: { phoneE164: digits } });
  const env = getEnv();
  const reveal = env.NODE_ENV !== "production" || env.ENABLE_DEV_BILLING === "true";
  return { sent: true, phone: digits, code: reveal ? code : undefined };
}

export async function confirmPhoneCode(userId: string, code: string) {
  const raw = await getRedis().get(phoneKey(userId));
  if (!raw) throw new AppError("INVALID", "That code expired. Request a new one.", 400);
  const parsed = JSON.parse(raw) as { hash: string; phone: string };
  if (!timingSafeEqual(parsed.hash, sha256(code.trim()))) {
    throw new AppError("INVALID", "That code is incorrect.", 400);
  }
  await prisma.profile.update({
    where: { userId },
    data: { phoneVerifiedAt: new Date(), phoneE164: parsed.phone },
  });
  await getRedis().del(phoneKey(userId));
  return { verified: true };
}

export async function markEmailVerified(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { emailVerifiedAt: new Date() },
  });
}
