import { getRedis } from "@/server/redis";
import { AppError } from "@/server/errors";

const DEFAULTS: Record<string, { limit: number; windowSec: number }> = {
  login: { limit: 8, windowSec: 60 * 15 },
  register: { limit: 5, windowSec: 60 * 60 },
  password_reset: { limit: 5, windowSec: 60 * 60 },
  flirt: { limit: 40, windowSec: 60 },
  like: { limit: 40, windowSec: 60 },
  super_like: { limit: 20, windowSec: 60 },
  direct_message: { limit: 20, windowSec: 60 },
  chat: { limit: 60, windowSec: 60 },
  report: { limit: 10, windowSec: 60 * 60 },
  verification: { limit: 5, windowSec: 60 * 60 },
  upload: { limit: 20, windowSec: 60 * 10 },
  profile: { limit: 40, windowSec: 60 },
};

export async function rateLimit(bucket: keyof typeof DEFAULTS | string, key: string) {
  const cfg = DEFAULTS[bucket] ?? { limit: 60, windowSec: 60 };
  try {
    const redis = getRedis();
    const redisKey = `rl:${bucket}:${key}`;
    const count = await redis.incr(redisKey);
    if (count === 1) await redis.expire(redisKey, cfg.windowSec);
    if (count > cfg.limit) {
      throw new AppError("RATE_LIMITED", "Please slow down and try again shortly.", 429);
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
  }
}
