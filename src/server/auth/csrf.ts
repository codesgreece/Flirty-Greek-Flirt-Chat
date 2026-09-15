import { cookies, headers } from "next/headers";
import { AppError } from "@/server/errors";
import { CSRF_COOKIE } from "@/server/auth/session";
import { getEnv } from "@/lib/env";

export async function assertCsrf() {
  const hdrs = await headers();
  const origin = hdrs.get("origin");
  const app = getEnv().APP_URL.replace(/\/$/, "");
  if (origin && origin !== app && !origin.startsWith(app)) {
    const allowed = new URL(app).origin;
    if (origin !== allowed) {
      throw new AppError("CSRF", "This request could not be verified.", 403);
    }
  }
  const headerToken = hdrs.get("x-csrf-token");
  const jar = await cookies();
  const cookieToken = jar.get(CSRF_COOKIE)?.value;
  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    if (hdrs.get("content-type")?.includes("multipart/form-data")) {
      return;
    }
    if (!origin) return;
    if (headerToken !== cookieToken) {
      throw new AppError("CSRF", "This request could not be verified.", 403);
    }
  }
}
