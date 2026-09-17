import { PrismaClient } from "@prisma/client";
import { hash, verify } from "@node-rs/argon2";
import { ARGON2_OPTIONS, passwordHashNeedsUpgrade } from "../src/server/auth/password";

const prisma = new PrismaClient();

function passwordFor(email: string) {
  return email === "admin@flirty.local" ? "FlirtyAdmin!234" : "FlirtyDev!234";
}

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, emailNormalized: true, passwordHash: true },
  });
  let updated = 0;
  for (const user of users) {
    if (!passwordHashNeedsUpgrade(user.passwordHash)) continue;
    const password = passwordFor(user.emailNormalized);
    const matches = await verify(user.passwordHash, password).catch(() => false);
    if (!matches) continue;
    const nextHash = await hash(password, ARGON2_OPTIONS);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: nextHash } });
    updated += 1;
    console.log("rehashed", user.emailNormalized);
  }
  console.log(`done: ${updated}/${users.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
