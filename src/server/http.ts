import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError, publicErrorMessage } from "@/server/errors";
import { requireAdmin, requireUser } from "@/server/auth/session";
import { assertCsrf } from "@/server/auth/csrf";
import { rateLimit } from "@/server/rate-limit";
import { headers } from "next/headers";

export async function clientMeta() {
  const hdrs = await headers();
  return {
    ip: hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1",
    userAgent: hdrs.get("user-agent") || "unknown",
  };
}

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function handleRoute<T>(fn: () => Promise<T>) {
  return fn()
    .then((data) => jsonOk(data as T))
    .catch((error) => {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Please check what you entered and try again.", code: "INVALID" },
          { status: 400 },
        );
      }
      if (!(error instanceof AppError)) {
        console.error("[flirty]", error);
      }
      const pub = publicErrorMessage(error);
      return NextResponse.json(pub.body, { status: pub.status });
    });
}

export async function mutate<T>(input: {
  auth?: "user" | "admin" | "public";
  bucket?: string;
  schema?: z.ZodType;
  body?: unknown;
  csrf?: boolean;
  handler: (ctx: { userId?: string; data: unknown }) => Promise<T>;
}) {
  return handleRoute(async () => {
    if (input.csrf !== false && input.auth !== "public") await assertCsrf();
    const meta = await clientMeta();
    if (input.bucket) await rateLimit(input.bucket, meta.ip);
    let userId: string | undefined;
    if (input.auth === "user") userId = (await requireUser()).userId;
    if (input.auth === "admin") userId = (await requireAdmin()).userId;
    const data = input.schema ? input.schema.parse(input.body ?? {}) : input.body;
    return input.handler({ userId, data });
  });
}

export { AppError, z };
