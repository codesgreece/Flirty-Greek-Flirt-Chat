function env(name: string) {
  return (process.env[name] ?? "").trim();
}

function withServerlessParams(url: string) {
  const extras: string[] = [];
  if (!/[?&]connection_limit=/.test(url)) extras.push("connection_limit=1");
  if (!/[?&]pool_timeout=/.test(url)) extras.push("pool_timeout=5");
  if (!/[?&]connect_timeout=/.test(url)) extras.push("connect_timeout=5");
  if ((url.includes("-pooler.") || url.includes("pooler.")) && !/[?&]pgbouncer=/.test(url)) {
    extras.push("pgbouncer=true");
  }
  if (!extras.length) return url;
  return url + (url.includes("?") ? "&" : "?") + extras.join("&");
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

export function prismaDatasourceUrl() {
  const url = resolveDatabaseUrl();
  return url ? withServerlessParams(url) : url;
}

resolveDatabaseUrl();
