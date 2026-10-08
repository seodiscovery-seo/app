/**
 * Data Access Layer for auth — the real security check.
 * Middleware only does a quick redirect; every page and action must call these.
 * The role is always read fresh from the database, so role changes apply immediately.
 */
import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { UserRole } from "@/config/constants";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { getSession } from "@/lib/auth/session";
import { passwordVersion } from "@/lib/auth/password-version";

export type CurrentUser = { id: string; email: string; name: string; role: UserRole };

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getSession();
  if (!session) return null;

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, role: true, isActive: true, passwordHash: true },
  });
  if (!user || !user.isActive) return null;
  // Password changed since this session started → session is no longer valid
  if (session.pv !== passwordVersion(user.passwordHash)) return null;
  return { id: user.id, email: user.email, name: user.name, role: user.role as UserRole };
});

/** For server actions: throws if not signed in or role not allowed. */
export async function requireUser(roles?: UserRole[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHORIZED", "Please sign in again.");
  if (roles && !roles.includes(user.role)) {
    throw new AppError("FORBIDDEN", "You don't have permission to do this.");
  }
  return user;
}

/** For pages: redirects to /login, or to /dashboard if the role is not allowed. */
export async function requireUserPage(roles?: UserRole[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (roles && !roles.includes(user.role)) redirect("/dashboard?denied=1");
  return user;
}
