import { describe, expect, it } from "vitest";
import { addUtcDays, consecutiveStreak, utcDay } from "@/server/chat/streak";

describe("chat streak", () => {
  it("unlocks after five consecutive qualified days", () => {
    const today = utcDay(new Date("2026-09-17T12:00:00Z"));
    const days = [0, 1, 2, 3, 4].map((n) => addUtcDays(today, -n).getTime());
    expect(consecutiveStreak(days, today)).toBe(5);
  });

  it("resets when a day is skipped", () => {
    const today = utcDay(new Date("2026-09-17T12:00:00Z"));
    const days = [0, 1, 3, 4].map((n) => addUtcDays(today, -n).getTime());
    expect(consecutiveStreak(days, today)).toBe(2);
  });

  it("returns zero when no qualified days exist", () => {
    const today = utcDay(new Date("2026-09-17T12:00:00Z"));
    expect(consecutiveStreak([], today)).toBe(0);
  });
});
