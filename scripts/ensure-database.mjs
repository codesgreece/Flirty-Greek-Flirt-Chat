#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadDotEnv() {
  const file = join(root, ".env");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadDotEnv();

function existingUrl() {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.PRISMA_DATABASE_URL ||
    ""
  ).trim();
}

function bake(url) {
  if (url) process.env.DATABASE_URL = url;
  mkdirSync(join(root, "src/generated"), { recursive: true });
  const safe = url.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  writeFileSync(
    join(root, "src/generated/database-url.ts"),
    `/** Generated at build time. Do not commit secrets. */\nexport const BAKED_DATABASE_URL = "${safe}";\n`,
  );
  if (url && !existsSync(join(root, ".env"))) {
    writeFileSync(join(root, ".env"), `DATABASE_URL="${url}"\n`);
  }
}

const current = existingUrl();
if (current) {
  console.log("[flirty] Using DATABASE_URL from the environment.");
  process.exit(0);
}

console.log("[flirty] No DATABASE_URL. Provisioning Prisma Postgres for this deploy...");
const result = spawnSync(
  "npx",
  ["--yes", "create-db@latest", "--json", "--region", "eu-central-1"],
  { encoding: "utf8", cwd: root, timeout: 120_000 },
);
if (result.status !== 0) {
  console.error(result.stdout);
  console.error(result.stderr);
  if (process.env.VERCEL) process.exit(result.status ?? 1);
  console.warn("[flirty] Continuing without a database. Login will be unavailable.");
  bake("");
  process.exit(0);
}

const stdout = (result.stdout || "").trim();
let parsed;
try {
  const start = stdout.indexOf("{");
  const end = stdout.lastIndexOf("}");
  parsed = JSON.parse(stdout.slice(start, end + 1));
} catch (error) {
  console.error("[flirty] Could not parse create-db output.", error);
  if (process.env.VERCEL) process.exit(1);
  bake("");
  process.exit(0);
}

const url = parsed.connectionString || parsed.databaseUrl || "";
if (!url) {
  console.error("[flirty] create-db returned no connection string.");
  if (process.env.VERCEL) process.exit(1);
  bake("");
  process.exit(0);
}

if (parsed.claimUrl) {
  console.log("[flirty] Claim this database so it is not deleted in 24 hours:");
  console.log(parsed.claimUrl);
}
bake(url);
