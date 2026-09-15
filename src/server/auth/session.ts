import { cookies } from "next/headers";
import { prisma, databaseConfigured } from "@/server/db";
import { getEnv } from "@/lib/env";
import { randomToken, sha256 } from "@/lib/crypto";
import { AppError } from "@/server/errors";

export const SESSION_COOKIE = "flirty_session";
const CSRF_COOKIE = "flirty_csrf";
const SESSION_DAYS = 30;

export async function createSession(userId: string, meta: { userAgent: string; ipHash: string }) {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await prisma.deviceSession.create({
    data: {
      userId,
      tokenHash: sha256(token),
      userAgent: meta.userAgent.slice(0, 300),
      ipHash: meta.ipHash,
      expiresAt,
    },
  });
  return { token, expiresAt };
}

export async function rotateSession(currentHash: string, userId: string, meta: { userAgent: string; ipHash: string }) {
  const next = await createSession(userId, meta);
  await prisma.deviceSession.updateMany({
    where: { tokenHash: currentHash, revokedAt: null },
    data: { revokedAt: new Date(), rotatedFromId: undefined },
  });
  return next;
}

export async function readSession() {
  if (!databaseConfigured()) return null;
  try {
    const jar = await cookies();
    const token = jar.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const session = await prisma.deviceSession.findUnique({
      where: { tokenHash: sha256(token) },
      include: { user: { include: { profile: true, adminProfile: true, subscription: { include: { plan: true } } } } },
    });
    if (!session || session.revokedAt || session.expiresAt < new Date()) return null;
    if (session.user.status !== "ACTIVE") return null;
    await prisma.deviceSession.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() },
    });
    await prisma.user.update({
      where: { id: session.userId },
      data: { lastActiveAt: new Date() },
    });
    return session;
  } catch {
    return null;
  }
}

export async function requireUser() {
  const session = await readSession();
  if (!session) throw new AppError("UNAUTHENTICATED", "Please sign in to continue.", 401);
  return session;
}

export async function requireAdmin() {
  const session = await requireUser();
  if (!session.user.adminProfile && session.user.role !== "ADMIN") {
    throw new AppError("FORBIDDEN", "You do not have access to this area.", 403);
  }
  return session;
}

export function cookieOptions(expiresAt: Date) {
  const env = getEnv();
  return {
    httpOnly: true as const,
    secure: env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, cookieOptions(expiresAt));
  if (!jar.get(CSRF_COOKIE)?.value) {
    jar.set(CSRF_COOKIE, randomToken(24), {
      httpOnly: false,
      secure: getEnv().NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });
  }
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", { ...cookieOptions(new Date(0)), maxAge: 0 });
}

export { CSRF_COOKIE };
