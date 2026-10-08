/**
 * Standard state for forms that use React's useActionState + server actions.
 */
import { ZodError } from "zod";
import { AppError, zodFieldErrors, type FieldErrors } from "@/lib/errors";
import { logger } from "@/lib/logger";

export type FormState = {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: FieldErrors;
} | undefined;

/** Converts thrown errors into a FormState the form can display. */
export function formError(err: unknown): FormState {
  if (err instanceof ZodError) {
    return { error: "Please fix the highlighted fields.", fieldErrors: zodFieldErrors(err) };
  }
  if (err instanceof AppError) return { error: err.message };
  if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "P2002"
  ) {
    return { error: "This record already exists (duplicate value)." };
  }
  logger.error("Form action failed", { error: err });
  return { error: "Something went wrong. Please try again." };
}

/** FormData → plain object of strings (empty strings become undefined). */
export function formToObject(formData: FormData): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$")) continue; // React internal fields
    const str = typeof value === "string" ? value.trim() : undefined;
    out[key] = str === "" ? undefined : str;
  }
  return out;
}
