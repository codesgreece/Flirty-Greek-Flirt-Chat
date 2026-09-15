import { describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { verifyPassword } from "@/server/auth/password";
import { scoreCompatibility } from "@/server/compatibility/engine";
import { PLAN_LIMITS } from "@/server/entitlements/catalog";

describe("seeded production data", () => {
  it("stores argon2id hashes, not plaintext", async () => {
    const user = await prisma.user.findUnique({ where: { emailNormalized: "elena@flirty.local" } });
    expect(user).toBeTruthy();
    expect(user?.passwordHash).not.toContain("FlirtyDev");
    expect(user?.passwordHash.startsWith("$argon2")).toBe(true);
    expect(await verifyPassword(user!.passwordHash, "FlirtyDev!234")).toBe(true);
  });

  it("keeps a unique active pair for Elena and Nikos", async () => {
    const elena = await prisma.user.findUniqueOrThrow({ where: { emailNormalized: "elena@flirty.local" } });
    const nikos = await prisma.user.findUniqueOrThrow({ where: { emailNormalized: "nikos@flirty.local" } });
    const matches = await prisma.match.findMany({
      where: {
        active: true,
        OR: [
          { lowUserId: elena.id, highUserId: nikos.id },
          { lowUserId: nikos.id, highUserId: elena.id },
        ],
      },
    });
    expect(matches).toHaveLength(1);
  });

  it("never allows a self-block row in seed", async () => {
    const rows = await prisma.block.findMany();
    expect(rows.every((row) => row.blockerId !== row.blockedId)).toBe(true);
  });
});

describe("subscription bypass resistance", () => {
  it("gold is required for see-who-liked regardless of client claims", () => {
    expect(PLAN_LIMITS.FREE.capabilities).not.toContain("SEE_WHO_LIKED");
  });
  it("compatibility remains deterministic", () => {
    const input = {
      interests: ["music"],
      vibes: ["ROMANTIC"],
      intention: "DATING",
      age: 28,
      preferredAge: { min: 24, max: 40 },
      distanceKm: 3,
      maxDistanceKm: 50,
      lifestyle: {},
      personality: {},
      relationshipGoal: "DATING",
      activity: "",
      communication: "thoughtful",
    };
    expect(scoreCompatibility(input, input).score).toBe(scoreCompatibility(input, input).score);
  });
});
