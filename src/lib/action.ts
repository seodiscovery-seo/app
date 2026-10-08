/**
 * Wrappers for programmatic server actions (called from client code, not forms):
 * consistent ActionResult shape, central error handling, auth enforcement.
 */
import "server-only";
import { unstable_rethrow } from "next/navigation";
import type { UserRole } from "@/config/constants";
import { requireUser, type CurrentUser } from "@/lib/auth/dal";
import { toActionError, type ActionResult } from "@/lib/errors";

export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}

export async function runUserAction<T>(
  fn: (user: CurrentUser) => Promise<T>,
  roles?: UserRole[],
): Promise<ActionResult<T>> {
  return runAction(async () => fn(await requireUser(roles)));
}
