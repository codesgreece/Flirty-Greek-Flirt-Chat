import { describe, expect, it } from "vitest";
import { AppError } from "@/server/errors";
import { publicErrorMessage } from "@/server/errors";

describe("error privacy", () => {
  it("never leaks internals", () => {
    const leaked = publicErrorMessage(new Error("Prisma unique constraint failed on User"));
    expect(leaked.body.error).not.toMatch(/Prisma/i);
    expect(leaked.status).toBe(500);
  });
  it("keeps app errors human", () => {
    const pub = publicErrorMessage(new AppError("BLOCKED", "This connection is not available.", 403));
    expect(pub.status).toBe(403);
    expect(pub.body.code).toBe("BLOCKED");
  });
});
