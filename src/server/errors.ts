export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
    public readonly extra?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function isDatabaseError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const name = error instanceof Error ? error.name : "";
  return (
    name === "PrismaClientInitializationError" ||
    /Environment variable not found: DATABASE_URL|Can't reach database|P1001|P1017|P2021/i.test(message)
  );
}

export function publicErrorMessage(error: unknown): {
  status: number;
  body: { error: string; code: string; extra?: Record<string, unknown> };
} {
  if (error instanceof AppError) {
    return { status: error.status, body: { error: error.message, code: error.code, extra: error.extra } };
  }
  if (isDatabaseError(error)) {
    return {
      status: 503,
      body: {
        error: "Permanent Postgres is not configured. Open /setup to connect a Vercel Neon database.",
        code: "DATABASE",
      },
    };
  }
  return {
    status: 500,
    body: { error: "Something went wrong. Please try again.", code: "INTERNAL" },
  };
}
