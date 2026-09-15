import { createHash, randomBytes, createHmac, timingSafeEqual as timingSafeEqualNative } from "crypto";

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hmac(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function hashIp(ip: string): string {
  return sha256(ip);
}

export function timingSafeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return left.compare(right) === 0 ? true : timingSafeEqualNative(left, right);
}
