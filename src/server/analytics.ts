import { prisma } from "@/server/db";

const SENSITIVE = new Set(["password", "token", "message", "body", "email"]);

export async function track(name: string, userId?: string | null, props: Record<string, unknown> = {}) {
  const safe: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(props)) {
    if (SENSITIVE.has(key.toLowerCase())) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      safe[key] = value;
    }
  }
  await prisma.analyticsEvent.create({
    data: { name, userId: userId ?? null, props: safe },
  });
}
