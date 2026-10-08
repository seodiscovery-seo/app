import "server-only";
import { PrismaClient } from "@prisma/client";
import { env } from "@/lib/env";

/** Single PrismaClient instance (prevents connection exhaustion during dev hot reloads). */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
