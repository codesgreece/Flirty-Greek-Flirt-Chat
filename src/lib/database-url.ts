export function resolveDatabaseUrl() {
  const url =
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_PRISMA_URL?.trim() ||
    process.env.POSTGRES_URL_NON_POOLING?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    process.env.PRISMA_DATABASE_URL?.trim() ||
    "";
  if (url && process.env.DATABASE_URL !== url) {
    process.env.DATABASE_URL = url;
  }
  return url;
}

resolveDatabaseUrl();
