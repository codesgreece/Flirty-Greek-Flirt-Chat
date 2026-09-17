import { describe, expect, it } from "vitest";
import { icebreakers } from "@/lib/icebreakers";
import { formatLastActive } from "@/lib/format";
import { hitsDealbreaker } from "@/lib/lifestyle";
import { isAllowedGifUrl } from "@/lib/stickers";
import { findShopPack } from "@/lib/shop";
import { findVibeRoom, inVibeRoom } from "@/lib/vibe-rooms";

describe("icebreakers", () => {
  it("uses shared interests instead of a generic hey", () => {
    const lines = icebreakers({
      name: "Elena",
      reasons: ["Same interests: jazz"],
      interests: ["Jazz"],
      vibes: ["Chill"],
      intention: "RELATIONSHIP",
      prompt: { question: "Sunday", answer: "slow Sundays" },
    });
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.some((line) => line.toLowerCase().includes("hey elena — want to skip"))).toBe(false);
    expect(lines.some((line) => line.includes("slow Sundays") || line.includes("Jazz") || line.includes("Chill"))).toBe(true);
  });
});

describe("formatLastActive", () => {
  it("shows active now and relative time", () => {
    expect(formatLastActive(new Date(), true)).toBe("Active now");
    expect(formatLastActive(new Date(Date.now() - 10 * 60_000))).toBe("Active 10 min ago");
  });
});

describe("dealbreakers", () => {
  it("hides regular smoking when requested", () => {
    expect(hitsDealbreaker(["smoking"], { smoking: "Regularly" })).toBe(true);
    expect(hitsDealbreaker(["smoking"], { smoking: "Never" })).toBe(false);
  });
});

describe("gifs", () => {
  it("allows starter giphy urls only over https", () => {
    expect(isAllowedGifUrl("https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif")).toBe(true);
    expect(isAllowedGifUrl("http://evil.example/x.gif")).toBe(false);
  });
});

describe("shop and rooms", () => {
  it("has the four consumable packs", () => {
    expect(findShopPack("super_likes_5")?.grant.superLikes).toBe(5);
    expect(findShopPack("boost_now")?.activate).toBe("boost");
    expect(findShopPack("first_message")?.grant.firstMessages).toBe(1);
    expect(findShopPack("spotlight_30")?.activate).toBe("spotlight");
  });

  it("maps vibe rooms", () => {
    const chill = findVibeRoom("chill");
    expect(chill).toBeTruthy();
    expect(inVibeRoom(chill!, ["CHILL"], [])).toBe(true);
    expect(inVibeRoom(findVibeRoom("travel")!, ["ADVENTUROUS"], [])).toBe(true);
  });
});
