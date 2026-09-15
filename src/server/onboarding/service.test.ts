import { describe, expect, it } from "vitest";
import { ONBOARDING_STEPS } from "@/server/onboarding/service";
import { onboardingSchema } from "@/server/onboarding/service";

describe("onboarding validation", () => {
  it("has fourteen product steps", () => {
    expect(ONBOARDING_STEPS).toHaveLength(14);
  });
  it("rejects underage payloads at schema age bounds for preferences", () => {
    const parsed = onboardingSchema.safeParse({ step: 13, minAge: 16 });
    expect(parsed.success).toBe(false);
  });
});
