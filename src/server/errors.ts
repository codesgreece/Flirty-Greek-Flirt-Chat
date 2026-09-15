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

export function publicErrorMessage(error: unknown): { status: number; body: { error: string; code: string } } {
  if (error instanceof AppError) {
    return { status: error.status, body: { error: error.message, code: error.code } };
  }
  return {
    status: 500,
    body: { error: "Something went wrong. Please try again.", code: "INTERNAL" },
  };
}
