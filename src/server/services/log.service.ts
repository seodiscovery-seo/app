import "server-only";
import type { Prisma } from "@prisma/client";
import { EMAIL_STATUSES, type EmailStatus } from "@/config/constants";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { startOfDay, toDateInput } from "@/lib/utils";

export type LogFilters = { q?: string; status?: string; template?: string; page: number; pageSize: number };

export async function listLogs(f: LogFilters) {
  const where: Prisma.EmailLogWhereInput = {
    ...(f.q ? { OR: [{ to: { contains: f.q.toLowerCase() } }, { subject: { contains: f.q } }, { id: f.q }, { providerId: f.q }] } : {}),
    ...(f.status && (EMAIL_STATUSES as readonly string[]).includes(f.status) ? { status: f.status } : {}),
    ...(f.template ? { templateKey: f.template } : {}),
  };
  const [total, items] = await Promise.all([
    db.emailLog.count({ where }),
    db.emailLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (f.page - 1) * f.pageSize,
      take: f.pageSize,
      select: { id: true, templateKey: true, to: true, subject: true, status: true, provider: true, source: true, attempts: true, createdAt: true, error: true },
    }),
  ]);
  return { items, total, page: f.page, pageSize: f.pageSize, totalPages: Math.max(1, Math.ceil(total / f.pageSize)) };
}

export function getLog(id: string) {
  return db.emailLog.findUnique({
    where: { id },
    include: { events: { orderBy: { createdAt: "asc" } } },
  });
}

/** Numbers for the dashboard: last N days. */
export async function getStats(days = 7) {
  const since = startOfDay(-(days - 1));
  const rows = await db.emailLog.findMany({
    where: { createdAt: { gte: since } },
    select: { status: true, createdAt: true },
  });
  const byStatus = Object.fromEntries(EMAIL_STATUSES.map((s) => [s, 0])) as Record<EmailStatus, number>;
  const perDay = new Map<string, { total: number; problems: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    perDay.set(toDateInput(d), { total: 0, problems: 0 });
  }
  for (const r of rows) {
    if (r.status in byStatus) byStatus[r.status as EmailStatus]++;
    const bucket = perDay.get(toDateInput(r.createdAt));
    if (bucket) {
      bucket.total++;
      if (["FAILED", "BOUNCED", "COMPLAINED"].includes(r.status)) bucket.problems++;
    }
  }
  const attempted = rows.length - byStatus.SUPPRESSED;
  const reached = byStatus.SENT + byStatus.DELIVERED + byStatus.DELAYED + byStatus.TEST;
  const problems = byStatus.FAILED + byStatus.BOUNCED + byStatus.COMPLAINED;
  return {
    total: rows.length,
    byStatus,
    successRate: attempted > 0 ? Math.round((reached / attempted) * 1000) / 10 : null,
    problemRate: attempted > 0 ? Math.round((problems / attempted) * 1000) / 10 : 0,
    days: [...perDay.entries()].map(([day, v]) => ({ day, ...v })),
  };
}

export async function lastSentByTemplate() {
  const rows = await db.emailLog.groupBy({ by: ["templateKey"], _max: { createdAt: true }, _count: { _all: true } });
  return new Map(rows.map((r) => [r.templateKey, { last: r._max.createdAt, count: r._count._all }]));
}

let lastCleanup = 0;
/** Deletes logs older than the retention period (runs at most once an hour). */
export async function cleanupOldLogs(retentionDays: number) {
  if (Date.now() - lastCleanup < 60 * 60 * 1000) return;
  lastCleanup = Date.now();
  try {
    const cutoff = new Date(Date.now() - retentionDays * 86_400_000);
    const { count } = await db.emailLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
    if (count) logger.info("Old email logs deleted", { count, retentionDays });
  } catch (err) {
    logger.error("Log cleanup failed", { error: err });
  }
}
