import "server-only";
import type { UserRole } from "@/config/constants";
import { burnPasswordCheck, verifyPassword } from "@/lib/auth/password";
import { findUserByEmail, touchLastLogin } from "@/server/services/user.service";

/** Returns the user on valid credentials, otherwise null. Never reveals which part was wrong. */
export async function verifyCredentials(email: string, password: string) {
  const user = await findUserByEmail(email);
  if (!user || !user.isActive) {
    await burnPasswordCheck(password);
    return null;
  }
  if (!(await verifyPassword(password, user.passwordHash))) return null;

  await touchLastLogin(user.id);
  return { id: user.id, email: user.email, role: user.role as UserRole };
}
