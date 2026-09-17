import Redis from "ioredis";
import { getEnv } from "@/lib/env";

const memory = new Map<string, { value: string; expiresAt: number }>();

class MemoryRedis {
  async get(key: string) {
    const row = memory.get(key);
    if (!row) return null;
    if (row.expiresAt < Date.now()) {
      memory.delete(key);
      return null;
    }
    return row.value;
  }
  async set(key: string, value: string, mode?: string, ttl?: number) {
    const expiresAt = mode === "EX" && ttl ? Date.now() + ttl * 1000 : Date.now() + 86400_000;
    memory.set(key, { value, expiresAt });
    return "OK";
  }
  async incr(key: string) {
    const current = Number((await this.get(key)) ?? "0") + 1;
    const existing = memory.get(key);
    memory.set(key, { value: String(current), expiresAt: existing?.expiresAt ?? Date.now() + 86400_000 });
    return current;
  }
  async expire(key: string, ttl: number) {
    const row = memory.get(key);
    if (!row) return 0;
    row.expiresAt = Date.now() + ttl * 1000;
    return 1;
  }
  async del(key: string) {
    return memory.delete(key) ? 1 : 0;
  }
  async sadd(key: string, member: string) {
    const raw = (await this.get(key)) ?? "[]";
    const set = new Set<string>(JSON.parse(raw) as string[]);
    set.add(member);
    await this.set(key, JSON.stringify([...set]));
    return 1;
  }
  async srem(key: string, member: string) {
    const raw = (await this.get(key)) ?? "[]";
    const set = new Set<string>(JSON.parse(raw) as string[]);
    set.delete(member);
    await this.set(key, JSON.stringify([...set]));
    return 1;
  }
  async smembers(key: string) {
    const raw = await this.get(key);
    return raw ? (JSON.parse(raw) as string[]) : [];
  }
  async pttl(key: string) {
    const row = memory.get(key);
    if (!row) return -2;
    return Math.max(0, row.expiresAt - Date.now());
  }
}

let client: Redis | MemoryRedis | null = null;
let usingMemory = false;

export function getRedis(): Redis | MemoryRedis {
  if (client) return client;
  const url = process.env.REDIS_URL?.trim() || getEnv().REDIS_URL;
  const isLocal =
    !url ||
    url.includes("127.0.0.1") ||
    url.includes("localhost") ||
    Boolean(process.env.VERCEL && url.includes("127.0.0.1"));
  if (isLocal) {
    client = new MemoryRedis();
    usingMemory = true;
    return client;
  }
  try {
    const redis = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
      connectTimeout: 200,
      commandTimeout: 200,
    });
    client = redis;
    redis.on("error", () => {
      if (!usingMemory) {
        usingMemory = true;
        client = new MemoryRedis();
      }
    });
    void redis.connect().catch(() => {
      usingMemory = true;
      client = new MemoryRedis();
    });
    return redis;
  } catch {
    client = new MemoryRedis();
    usingMemory = true;
    return client;
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await getRedis().get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSec = 300) {
  try {
    await getRedis().set(key, JSON.stringify(value), "EX", ttlSec);
  } catch {
    /* cache is optional */
  }
}
