import "server-only";
import type { SuppressionReason } from "@/config/constants";
import { db } from "@/lib/db";

export function listSuppressions(q?: string) {
  return db.suppression.findMany({
    where: q ? { email: { contains: q.toLowerCase() } } : {},
    orderBy: { createdAt: "desc" },
    take: 1000,
  });
}

export async function suppress(email: string, reason: SuppressionReason, detail?: string) {
  const address = email.trim().toLowerCase();
  return db.suppression.upsert({
    where: { email: address },
    // a spam complaint is stronger than a bounce: keep the stronger reason
    update: reason === "COMPLAINT" ? { reason, detail: detail ?? null } : {},
    create: { email: address, reason, detail: detail ?? null },
  });
}

export async function unsuppress(email: string) {
  await db.suppression.deleteMany({ where: { email: email.trim().toLowerCase() } });
}
