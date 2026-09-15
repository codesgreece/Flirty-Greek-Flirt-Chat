import { z } from "zod";

function defaultAppUrl() {
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

const schema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  REDIS_URL: z.string().min(1).default("redis://127.0.0.1:6379"),
  SESSION_SECRET: z
    .string()
    .min(32)
    .default("dev-only-session-secret-change-me-please-32b-min"),
  APP_URL: z.string().url().default(defaultAppUrl()),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  STORAGE_LOCAL_PATH: z.string().default("./data/uploads"),
  STORAGE_S3_ENDPOINT: z.string().optional(),
  STORAGE_S3_BUCKET: z.string().optional(),
  STORAGE_S3_ACCESS_KEY: z.string().optional(),
  STORAGE_S3_SECRET_KEY: z.string().optional(),
  STORAGE_S3_REGION: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  SEED_ON_BOOT: z.string().optional(),
  ENABLE_DEV_BILLING: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.flatten().fieldErrors;
    throw new Error(`Invalid environment configuration: ${JSON.stringify(details)}`);
  }
  cached = parsed.data;
  return cached;
}
