import "server-only";
import type { UserRole } from "@/config/constants";
import { hashPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { clearPending } from "@/lib/auth/tokens";

const publicUser = { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true } as const;

export function findUserByEmail(email: string) {
  return db.user.findUnique({ where: { email: email.toLowerCase() } });
}

export function touchLastLogin(userId: string) {
  return db.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
}

export function listUsers() {
  return db.user.findMany({ select: publicUser, orderBy: [{ isActive: "desc" }, { role: "asc" }, { name: "asc" }] });
}

export async function createUser(input: { name: string; email: string; role: UserRole; password: string }) {
  return db.user.create({
    data: { name: input.name, email: input.email.toLowerCase(), role: input.role, passwordHash: await hashPassword(input.password) },
    select: publicUser,
  });
}

export async function updateUser(actorId: string, input: { id: string; role: UserRole; isActive: boolean; password?: string }) {
  const user = await db.user.findUnique({ where: { id: input.id } });
  if (!user) throw new AppError("NOT_FOUND", "User not found.");
  if (input.id === actorId && (input.role !== "ADMIN" || !input.isActive)) {
    throw new AppError("VALIDATION", "You can't remove your own admin access.");
  }
  if (user.role === "ADMIN" && (input.role !== "ADMIN" || !input.isActive)) {
    const others = await db.user.count({ where: { role: "ADMIN", isActive: true, NOT: { id: input.id } } });
    if (others === 0) throw new AppError("VALIDATION", "At least one active admin is required.");
  }
  if (input.isActive) await clearPending(input.id); // admin approved a self-signed-up account by hand
  await db.user.update({
    where: { id: input.id },
    data: {
      role: input.role,
      isActive: input.isActive,
      ...(input.password ? { passwordHash: await hashPassword(input.password) } : {}),
    },
  });
}
