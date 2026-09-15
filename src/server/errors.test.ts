import { describe, expect, it } from "vitest";
import { AppError, publicErrorMessage } from "@/server/errors";

describe("error privacy", () => {
  it("never leaks internals", () => {
    const leaked = publicErrorMessage(new Error("Prisma unique constraint failed on User"));
    expect(leaked.body.error).not.toMatch(/Prisma/i);
    expect(leaked.status).toBe(500);
  });

  it("maps unreachable databases without leaking internals", () => {
    const pub = publicErrorMessage(new Error("Can't reach database server at `db.prisma.io`"));
    expect(pub.status).toBe(503);
    expect(pub.body.code).toBe("DATABASE");
    expect(pub.body.error).not.toMatch(/prisma.io/i);
  });

  it("keeps app errors human", () => {
    const pub = publicErrorMessage(new AppError("BLOCKED", "This connection is not available.", 403));
    expect(pub.status).toBe(403);
    expect(pub.body.code).toBe("BLOCKED");
  });
});
