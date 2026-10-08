import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { logger } from "@/lib/logger";

export type ErrorCode =
  | "VALIDATION"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "PROVIDER"
  | "INTERNAL";

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  PROVIDER: 502,
  INTERNAL: 500,
};

/** Expected, user-safe error. Its message may be shown to the user. */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
  }
}

export type FieldErrors = Record<string, string[]>;

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; code: ErrorCode; error: string; fieldErrors?: FieldErrors };

export function zodFieldErrors(err: ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_form";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

/** Converts any thrown value into a safe ActionResult failure. Unknown errors are logged, never leaked. */
export function toActionError(err: unknown): Extract<ActionResult<never>, { ok: false }> {
  if (err instanceof AppError) {
    return { ok: false, code: err.code, error: err.message };
  }
  if (err instanceof ZodError) {
    return { ok: false, code: "VALIDATION", error: "Invalid input.", fieldErrors: zodFieldErrors(err) };
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const rawTarget: unknown = err.meta?.target;
      const target = Array.isArray(rawTarget) ? rawTarget.join(", ") : "field";
      return { ok: false, code: "CONFLICT", error: `A record with this ${target} already exists.` };
    }
    if (err.code === "P2025") {
      return { ok: false, code: "NOT_FOUND", error: "Record not found." };
    }
  }
  logger.error("Unhandled error", { error: err });
  return { ok: false, code: "INTERNAL", error: "Something went wrong. Please try again." };
}
