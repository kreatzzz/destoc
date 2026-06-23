import { NextResponse } from "next/server";
import { z } from "zod";

export type AppErrorCode =
  | "AUTHENTICATION_REQUIRED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "CONFIGURATION_ERROR"
  | "INTERNAL_ERROR";

const statusByCode: Record<AppErrorCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  CONFIGURATION_ERROR: 500,
  INTERNAL_ERROR: 500,
};

export class AppError extends Error {
  readonly status: number;
  readonly expose: boolean;

  constructor(
    public readonly code: AppErrorCode,
    message: string,
    options?: { cause?: unknown; status?: number; expose?: boolean },
  ) {
    super(message, { cause: options?.cause });
    this.name = "AppError";
    this.status = options?.status ?? statusByCode[code];
    this.expose = options?.expose ?? code !== "INTERNAL_ERROR";
  }
}

export function asAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  if (error instanceof z.ZodError) {
    return new AppError("VALIDATION_ERROR", "The supplied data is invalid.", {
      cause: error,
    });
  }

  return new AppError("INTERNAL_ERROR", "An unexpected error occurred.", {
    cause: error,
    expose: false,
  });
}

export function errorResponse(error: unknown): NextResponse {
  const appError = asAppError(error);

  if (appError.code === "INTERNAL_ERROR") {
    console.error("Unhandled application error", appError.cause ?? appError);
  }

  return NextResponse.json(
    {
      error: {
        code: appError.code,
        message: appError.expose ? appError.message : "An unexpected error occurred.",
      },
    },
    { status: appError.status },
  );
}

export async function withRouteErrorHandling<T>(
  handler: () => Promise<T>,
): Promise<T | NextResponse> {
  try {
    return await handler();
  } catch (error) {
    return errorResponse(error);
  }
}
