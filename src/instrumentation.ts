export async function register() {
  const { resolveDatabaseUrl } = await import("./lib/database-url");
  resolveDatabaseUrl();
}
