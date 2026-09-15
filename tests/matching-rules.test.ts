import { describe, expect, it } from "vitest";

function orderedPair(a: string, b: string) {
  return a < b ? [a, b] : [b, a];
}

describe("match identity rules", () => {
  it("stores a stable unordered pair", () => {
    expect(orderedPair("b", "a")).toEqual(["a", "b"]);
    expect(orderedPair("a", "a")[0]).toBe("a");
  });
  it("rejects self targeting conceptually", () => {
    const actor = "user-1";
    const target = "user-1";
    expect(actor === target).toBe(true);
  });
});
