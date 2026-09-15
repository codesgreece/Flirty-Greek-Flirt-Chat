import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrisma() {
  const client =
    globalForPrisma.prisma ??
    new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client;
  return client;
}

export function databaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = createPrisma();
    const value = Reflect.get(client, prop, receiver) as unknown;
    return typeof value === "function" ? value.bind(client) : value;
  },
});
