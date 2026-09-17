import { PrismaClient } from "@prisma/client";
import { prismaDatasourceUrl, resolveDatabaseUrl } from "@/lib/database-url";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrisma() {
  const url = prismaDatasourceUrl();
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
      ...(url ? { datasources: { db: { url } } } : {}),
    });
  }
  return globalForPrisma.prisma;
}

export function databaseConfigured() {
  return Boolean(resolveDatabaseUrl());
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = createPrisma();
    const value = Reflect.get(client, prop, receiver) as unknown;
    return typeof value === "function" ? value.bind(client) : value;
  },
});
