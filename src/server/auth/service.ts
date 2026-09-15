import { z } from "zod";
import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { createSession, setSessionCookie, clearSessionCookie } from "@/server/auth/session";
import { audit } from "@/server/audit";
import { track } from "@/server/analytics";
import { hashIp } from "@/lib/crypto";
import { rateLimit } from "@/server/rate-limit";
import { PLAN_LIMITS } from "@/server/entitlements/catalog";

export const registerSchema = z.object({
  email: z.string().email().max(190),
  password: z.string().min(10).max(120),
});

export const loginSchema = registerSchema;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function ensureFreePlan(userId: string) {
  const free = await prisma.subscriptionPlan.findUnique({ where: { code: "FREE" } });
  if (!free) return;
  await prisma.subscription.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      planId: free.id,
      status: "ACTIVE",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 20),
      provider: "internal",
    },
  });
  void PLAN_LIMITS;
}

export async function registerUser(input: z.infer<typeof registerSchema>, meta: { ip: string; userAgent: string }) {
  await rateLimit("register", meta.ip);
  const email = normalizeEmail(input.email);
  const existing = await prisma.user.findUnique({ where: { emailNormalized: email } });
  if (existing) throw new AppError("EMAIL_TAKEN", "An account with this email already exists.", 409);
  const user = await prisma.user.create({
    data: {
      email: input.email.trim(),
      emailNormalized: email,
      passwordHash: await hashPassword(input.password),
      notificationPrefs: { create: {} },
      privacy: { create: {} },
    },
  });
  await ensureFreePlan(user.id);
  const session = await createSession(user.id, { userAgent: meta.userAgent, ipHash: hashIp(meta.ip) });
  await setSessionCookie(session.token, session.expiresAt);
  await audit({ action: "REGISTER", userId: user.id, ipHash: hashIp(meta.ip) });
  await track("user_registered", user.id);
  return { userId: user.id };
}

export async function loginUser(input: z.infer<typeof loginSchema>, meta: { ip: string; userAgent: string }) {
  await rateLimit("login", meta.ip);
  const email = normalizeEmail(input.email);
  const user = await prisma.user.findUnique({ where: { emailNormalized: email } });
  const fail = async (userId?: string) => {
    await prisma.loginAttempt.create({
      data: { userId, email, success: false, ipHash: hashIp(meta.ip) },
    });
    await audit({ action: "LOGIN_FAILED", userId, metadata: { email }, ipHash: hashIp(meta.ip) });
    throw new AppError("INVALID_CREDENTIALS", "Email or password is incorrect.", 401);
  };
  if (!user || user.status !== "ACTIVE") {
    await fail(user?.id);
    return { userId: "", onboardingComplete: false };
  }
  const ok = await verifyPassword(user.passwordHash, input.password);
  if (!ok) {
    await fail(user.id);
    return { userId: "", onboardingComplete: false };
  }
  const session = await createSession(user.id, { userAgent: meta.userAgent, ipHash: hashIp(meta.ip) });
  await setSessionCookie(session.token, session.expiresAt);
  await prisma.loginAttempt.create({
    data: { userId: user.id, email, success: true, ipHash: hashIp(meta.ip) },
  });
  await audit({ action: "LOGIN_SUCCESS", userId: user.id, ipHash: hashIp(meta.ip) });
  return { userId: user.id, onboardingComplete: Boolean(user) };
}

export async function logoutUser(tokenHash: string, userId: string) {
  await prisma.deviceSession.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  await clearSessionCookie();
  await audit({ action: "SESSION_REVOKED", userId });
}

export async function changePassword(userId: string, current: string, next: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await verifyPassword(user.passwordHash, current))) {
    throw new AppError("INVALID_CREDENTIALS", "Current password is incorrect.", 401);
  }
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(next) },
  });
  await prisma.deviceSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  await audit({ action: "PASSWORD_CHANGED", userId });
}
