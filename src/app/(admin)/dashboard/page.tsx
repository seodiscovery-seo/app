import type { Metadata } from "next";
import Link from "next/link";
import { getTemplateDef } from "@/emails/registry";
import { requireUserPage } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { env, isLiveMode } from "@/lib/env";
import { cn, formatDate, formatDateTime, formatNumber } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { getStats } from "@/server/services/log.service";
import { getAllSettings } from "@/server/services/settings.service";

export const metadata: Metadata = { title: "Overview" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const user = await requireUserPage();
  const [stats, settings, recent, keyCount, sp] = await Promise.all([
    getStats(7),
    getAllSettings(),
    db.emailLog.findMany({ orderBy: { createdAt: "desc" }, take: 6, select: { id: true, templateKey: true, to: true, status: true, createdAt: true } }),
    db.apiKey.count({ where: { revokedAt: null } }),
    searchParams,
  ]);
  const live = isLiveMode();
  const b = stats.byStatus;
  const max = Math.max(1, ...stats.days.map((d) => d.total));
  const sent = b.SENT + b.TEST + b.DELAYED + b.DELIVERED;
  const problems = b.FAILED + b.BOUNCED + b.COMPLAINED;
  const healthy = stats.problemRate < 5;

  const checklist = [
    { done: settings["brand.name"] !== "My App", label: "Brand name, colour and logo", href: "/settings" },
    { done: !!settings["sending.fromEmail"], label: "From address on your domain", href: "/settings" },
    { done: keyCount > 0, label: "API key for your website", href: "/api-keys" },
    { done: !!env.RESEND_API_KEY, label: "Resend connected (go live)", href: "/api-keys#go-live" },
    { done: !!env.RESEND_WEBHOOK_SECRET, label: "Bounce tracking switched on", href: "/api-keys#webhook" },
  ];
  const doneCount = checklist.filter((c) => c.done).length;
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const tiles = [
    { label: live ? "Sent" : "Created in test", value: sent, href: "/logs", dot: "bg-brand" },
    { label: "Delivered", value: b.DELIVERED, href: "/logs?status=DELIVERED", dot: "bg-emerald-500" },
    { label: "Bounced or spam", value: b.BOUNCED + b.COMPLAINED, href: "/logs?status=BOUNCED", dot: "bg-signal" },
    { label: "Failed", value: b.FAILED, href: "/logs?status=FAILED", dot: "bg-danger" },
    { label: "Blocked", value: b.SUPPRESSED, href: "/logs?status=SUPPRESSED", dot: "bg-zinc-400" },
  ];

  return (
    <>
      {sp.denied && <p className="mb-5 rounded-xl border border-warn/25 bg-warn/5 px-4 py-3 text-sm font-medium text-warn">Only admins can open that page.</p>}

      <p className="text-sm font-medium text-muted">{hello}, {user.name.split(" ")[0]}</p>
      <h1 className="mt-1 text-[1.65rem] font-bold tracking-[-0.02em]">Here&apos;s how your emails did this week</h1>

      {/* Health + chart */}
      <section className="card mt-6 grid overflow-hidden lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="flex flex-col justify-between gap-6 border-b border-line p-6 lg:border-b-0 lg:border-r">
          <div>
            <span className={cn("chip", stats.total === 0 ? "bg-paper text-muted" : healthy ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>
              <span className={cn("h-1.5 w-1.5 rounded-full", stats.total === 0 ? "bg-muted" : healthy ? "bg-emerald-500" : "bg-rose-500")} />
              {stats.total === 0 ? "Waiting for the first email" : healthy ? "Running smoothly" : "Needs attention"}
            </span>
            <p className="mt-4 text-[2.6rem] font-bold leading-none tracking-[-0.03em] tabular-nums">
              {stats.successRate === null ? "—" : `${stats.successRate}%`}
            </p>
            <p className="mt-2 text-sm text-muted">
              {stats.total === 0
                ? "of emails reached the provider. Send a test from Emails to see numbers here."
                : `of ${formatNumber(stats.total)} emails reached the provider${problems ? `, ${problems} had a problem` : ", none had a problem"}.`}
            </p>
          </div>
          {!healthy && stats.total > 0 && (
            <Link href="/logs?status=FAILED" className="btn-secondary self-start">See what went wrong</Link>
          )}
        </div>
        <div className="p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="section-title">Last 7 days</h2>
            <span className="flex gap-4 text-xs text-muted">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-brand" />Sent</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-signal" />Problem</span>
            </span>
          </div>
          <div className="mt-5 flex h-36 items-end gap-2.5" role="img" aria-label="Emails per day for the last 7 days">
            {stats.days.map((d, i) => {
              const today = i === stats.days.length - 1;
              return (
                <div key={d.day} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                  <span className="text-xs font-semibold tabular-nums text-ink">{d.total || ""}</span>
                  <div className="flex h-full w-full max-w-10 flex-col justify-end overflow-hidden rounded-lg bg-paper">
                    <div className="bg-signal" style={{ height: `${(d.problems / max) * 100}%` }} />
                    <div className={today ? "bg-brand" : "bg-brand/70"} style={{ height: `${((d.total - d.problems) / max) * 100}%` }} />
                  </div>
                  <span className={cn("text-xs", today ? "font-bold text-ink" : "text-muted")}>{today ? "Today" : formatDate(d.day).slice(0, 2)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Numbers */}
      <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-label="Email numbers">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className="card group px-5 py-4 transition-colors hover:border-brand/30">
            <p className="flex items-center gap-2 text-xs font-semibold text-muted">
              <span className={cn("h-2 w-2 rounded-full", t.dot)} aria-hidden="true" />
              {t.label}
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight">{formatNumber(t.value)}</p>
          </Link>
        ))}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between px-6 pt-5">
            <h2 className="section-title">Latest emails</h2>
            <Link href="/logs" className="text-sm font-semibold text-brand hover:underline">View all</Link>
          </div>
          {recent.length === 0 ? (
            <div className="px-6 pb-8 pt-4">
              <p className="text-sm text-muted">No emails yet.</p>
              <Link href="/templates" className="btn-primary mt-4">Send your first test</Link>
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {recent.map((r) => (
                <li key={r.id}>
                  <Link href={`/logs/${r.id}`} className="flex items-center gap-4 px-6 py-3.5 hover:bg-paper/70">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-soft text-brand" aria-hidden="true">
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16v12H4zM4 7l8 6 8-6" /></svg>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{getTemplateDef(r.templateKey)?.name ?? r.templateKey}</span>
                      <span className="block truncate text-xs text-muted">{r.to}</span>
                    </span>
                    <StatusBadge status={r.status} />
                    <span className="hidden w-28 shrink-0 text-right text-xs text-muted sm:block">{formatDateTime(r.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="section-title">Ready to go live</h2>
            <span className="text-xs font-semibold tabular-nums text-muted">{doneCount}/{checklist.length}</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-paper" role="progressbar" aria-valuenow={doneCount} aria-valuemin={0} aria-valuemax={checklist.length} aria-label="Go-live progress">
            <div className="h-full rounded-full bg-signal transition-all" style={{ width: `${(doneCount / checklist.length) * 100}%` }} />
          </div>
          <ol className="mt-5 space-y-1">
            {checklist.map((c) => (
              <li key={c.label}>
                <Link href={c.href} className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm hover:bg-paper">
                  <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full", c.done ? "bg-emerald-500 text-white" : "border-2 border-line")} aria-hidden="true">
                    {c.done && <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3.5}><path d="m5 12 4 4 10-10" /></svg>}
                  </span>
                  <span className={cn(c.done ? "text-muted line-through decoration-line" : "font-medium")}>
                    <span className="sr-only">{c.done ? "Done: " : "To do: "}</span>
                    {c.label}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  );
}
