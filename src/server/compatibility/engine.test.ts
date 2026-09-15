import { describe, expect, it } from "vitest";
import { scoreCompatibility } from "@/server/compatibility/engine";
import { PLAN_LIMITS, CAPABILITIES } from "@/server/entitlements/catalog";
import { ageFromDob, assertAdult } from "@/lib/dates";
import { haversineKm } from "@/lib/geo";

const base = {
  interests: ["music", "sea", "food"],
  vibes: ["ROMANTIC", "CHILL"],
  intention: "RELATIONSHIP",
  age: 29,
  preferredAge: { min: 24, max: 36 },
  distanceKm: 4,
  maxDistanceKm: 40,
  lifestyle: { pace: "balanced" },
  personality: {},
  relationshipGoal: "RELATIONSHIP",
  activity: "evenings-out",
  communication: "thoughtful",
};

describe("compatibility engine", () => {
  it("scores overlapping profiles highly", () => {
    const result = scoreCompatibility(base, { ...base, age: 30 });
    expect(result.score).toBeGreaterThan(80);
    expect(result.intent).toBe(100);
  });

  it("drops score when intention and vibe diverge", () => {
    const result = scoreCompatibility(base, {
      ...base,
      intention: "CASUAL",
      vibes: ["AMBITIOUS"],
      interests: ["tech"],
      relationshipGoal: "CASUAL",
    });
    expect(result.score).toBeLessThan(70);
  });
});

describe("entitlements catalog", () => {
  it("does not grant see-who-liked on free", () => {
    expect(PLAN_LIMITS.FREE.capabilities.includes(CAPABILITIES.SEE_WHO_LIKED)).toBe(false);
    expect(PLAN_LIMITS.GOLD.capabilities.includes(CAPABILITIES.SEE_WHO_LIKED)).toBe(true);
  });
  it("uses null for unlimited counters", () => {
    expect(PLAN_LIMITS.PLUS.likesPerDay).toBeNull();
    expect(PLAN_LIMITS.FREE.likesPerDay).toBe(50);
    expect(PLAN_LIMITS.PLATINUM.directMessagesPerDay).toBeNull();
  });
});

describe("age rules", () => {
  it("rejects under 18", () => {
    const dob = new Date();
    dob.setUTCFullYear(dob.getUTCFullYear() - 17);
    expect(ageFromDob(dob)).toBeLessThan(18);
    expect(() => assertAdult(dob)).toThrow();
  });
});

describe("geo privacy", () => {
  it("computes city-scale distances", () => {
    const km = haversineKm(
      { latitude: 37.9838, longitude: 23.7275 },
      { latitude: 37.9755, longitude: 23.7348 },
    );
    expect(km).toBeGreaterThan(0);
    expect(km).toBeLessThan(5);
  });
});
