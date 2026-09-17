export function csrfToken() {
  if (typeof document === "undefined") return "";
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith("flirty_csrf="))
    ?.split("=")[1];
}

export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public extra?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("x-csrf-token")) headers.set("x-csrf-token", decodeURIComponent(csrfToken() ?? ""));
  if (init.body && !(init.body instanceof FormData) && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const res = await fetch(path, { ...init, headers, credentials: "include" });
  const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string; extra?: Record<string, unknown> };
  if (!res.ok) throw new ApiError(data.error || "Something went wrong.", data.code || "ERROR", res.status, data.extra);
  return data as T;
}
