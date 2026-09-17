function env(name: string) {
  return (process.env[name] ?? "").trim();
}

export function resolveDatabaseUrl() {
  const url =
    env("DATABASE_URL") ||
    env("POSTGRES_PRISMA_URL") ||
    env("POSTGRES_URL_NON_POOLING") ||
    env("POSTGRES_URL") ||
    env("PRISMA_DATABASE_URL");
  if (url && process.env.DATABASE_URL !== url) {
    process.env.DATABASE_URL = url;
  }
  return url;
}

resolveDatabaseUrl();
