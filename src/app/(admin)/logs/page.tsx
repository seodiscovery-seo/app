import type { Metadata } from "next";
import Link from "next/link";
import { EMAIL_STATUSES, STATUS_LABELS } from "@/config/constants";
import { ALL_TEMPLATES, getTemplateDef } from "@/emails/registry";
import { requireUserPage } from "@/lib/auth/dal";
import { formatDateTime } from "@/lib/utils";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { StatusBadge } from "@/components/status-badge";
import { listLogs } from "@/server/services/log.service";

export const metadata: Metadata = { title: "Logs" };

type SP = Record<string, string | undefined>;

export default async function LogsPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireUserPage();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const result = await listLogs({ q: sp.q?.trim() || undefined, status: sp.status, template: sp.template, page, pageSize: 25 });
  const filtered = !!(sp.q || sp.status || sp.template);

  return (
    <>
      <PageHeader title="Logs" description="Every email your app asked to send, newest first. Links and codes are hidden." />

      <form method="get" className="card mb-4 flex flex-wrap gap-3 p-4">
        <input name="q" defaultValue={sp.q} placeholder="Recipient email or subject" className="input min-w-56 flex-1" aria-label="Search logs" />
        <select name="status" defaultValue={sp.status ?? ""} className="input w-auto" aria-label="Status">
          <option value="">Any status</option>
          {EMAIL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <select name="template" defaultValue={sp.template ?? ""} className="input w-auto" aria-label="Email">
          <option value="">Any email</option>
          {ALL_TEMPLATES.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
        </select>
        <button type="submit" className="btn-primary">Filter</button>
        {filtered && <Link href="/logs" className="btn-ghost">Clear</Link>}
      </form>

      <div className="card overflow-hidden">
        {result.items.length === 0 ? (
          <EmptyState
            title={filtered ? "No emails match" : "No emails yet"}
            text={filtered ? "Try another filter." : "Send a test from any email's page, or connect your app with an API key."}
            action={<Link href="/templates" className="btn-secondary">Open emails</Link>}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="border-b border-line bg-paper/60">
                  <tr>
                    <th className="th">Recipient</th>
                    <th className="th">Email</th>
                    <th className="th">Status</th>
                    <th className="th">From</th>
                    <th className="th">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {result.items.map((l) => (
                    <tr key={l.id} className="hover:bg-paper/50">
                      <td className="td">
                        <Link href={`/logs/${l.id}`} className="font-medium hover:text-brand">{l.to}</Link>
                        <p className="max-w-xs truncate text-xs text-muted">{l.subject}</p>
                      </td>
                      <td className="td">{getTemplateDef(l.templateKey)?.name ?? l.templateKey}</td>
                      <td className="td">
                        <StatusBadge status={l.status} />
                        {l.error && ["FAILED", "BOUNCED", "COMPLAINED", "SUPPRESSED"].includes(l.status) && (
                          <p className="mt-1 max-w-[220px] truncate text-xs text-muted" title={l.error}>{l.error}</p>
                        )}
                      </td>
                      <td className="td text-muted">{l.source === "admin-test" ? "Admin test" : l.source === "admin" ? "Admin" : l.source === "api" ? "Your app" : "System"}</td>
                      <td className="td whitespace-nowrap text-muted">{formatDateTime(l.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={result.page} totalPages={result.totalPages} total={result.total} pageSize={result.pageSize} params={sp} />
          </>
        )}
      </div>
    </>
  );
}
