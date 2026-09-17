#!/usr/bin/env node
/**
 * Uses a permanent DATABASE_URL from Vercel/Neon env vars.
 * Never provisions a 24h/72h throwaway database.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
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

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const url = existingUrl();
if (!url) {
  console.warn("[flirty] No permanent DATABASE_URL / POSTGRES_URL.");
  console.warn("[flirty] Create Neon/Postgres in Vercel Storage, connect Production, and redeploy.");
  console.warn("[flirty] Skipping migrate/seed. Login stays unavailable until that env var exists.");
  process.exit(0);
}

const migrateUrl =
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DIRECT_URL ||
  url;
process.env.DATABASE_URL = migrateUrl;
console.log("[flirty] Using permanent Postgres from the environment.");
run("npx", ["prisma", "migrate", "deploy"]);
process.env.DATABASE_URL = url;
run("npx", ["prisma", "db", "seed"]);
