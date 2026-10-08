import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getTemplateDef } from "@/emails/registry";
import { requireUserPage } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { getLog } from "@/server/services/log.service";

export const metadata: Metadata = { title: "Email log" };

const EVENT_LABELS: Record<string, string> = {
  "email.sent": "Accepted by Resend",
  "email.delivered": "Delivered to inbox server",
  "email.delivery_delayed": "Delivery delayed",
  "email.bounced": "Bounced",
  "email.complained": "Marked as spam",
  "email.failed": "Failed",
  "email.opened": "Opened",
  "email.clicked": "Link clicked",
};

export default async function LogPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUserPage();
  const { id } = await params;
  const log = await getLog(id);
  if (!log) notFound();
  const def = getTemplateDef(log.templateKey);
  const blocked = await db.suppression.findUnique({ where: { email: log.to } });
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(log.dataMasked ?? "{}") as Record<string, unknown>;
  } catch {
    data = {};
  }

  const steps: { label: string; at: Date | null; tone?: "bad" }[] = [
    { label: "Requested", at: log.createdAt },
    ...(log.sentAt ? [{ label: log.provider === "test" ? "Created in test mode (not delivered)" : "Handed to Resend", at: log.sentAt }] : []),
    ...log.events.map((e) => ({
      label: `${EVENT_LABELS[e.type] ?? e.type}${e.detail ? `: ${e.detail}` : ""}`,
      at: e.createdAt,
      tone: ["email.bounced", "email.complained", "email.failed"].includes(e.type) ? ("bad" as const) : undefined,
    })),
    ...(log.status === "FAILED" ? [{ label: `Failed after ${log.attempts} attempt(s): ${log.error ?? ""}`, at: log.updatedAt, tone: "bad" as const }] : []),
    ...(log.status === "SUPPRESSED" ? [{ label: log.error ?? "Blocked", at: log.updatedAt, tone: "bad" as const }] : []),
  ];

  return (
    <>
      <Link href="/logs" className="text-sm text-muted hover:text-ink">Logs</Link>
      <div className="mb-6 mt-1 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{log.subject}</h1>
        <StatusBadge status={log.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <section className="card p-5">
            <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
              <Item label="To">{log.to}</Item>
              <Item label="Email">{def ? <Link href={`/templates/${def.key}`} className="text-brand hover:underline">{def.name}</Link> : log.templateKey}</Item>
              <Item label="Requested by">{log.source === "admin-test" ? "Admin test" : log.source === "admin" ? "Admin (Send a document)" : log.source === "api" ? "Your app (API)" : "System"}</Item>
              <Item label="Sent with">{log.provider === "test" ? "Test mode" : log.provider === "none" ? "Not sent" : "Resend"}</Item>
              <Item label="Attempts">{String(log.attempts)}</Item>
              <Item label="Provider ID"><span className="break-all font-mono text-xs">{log.providerId ?? "—"}</span></Item>
            </dl>
            {blocked && (
              <p className="mt-4 rounded-lg border border-line bg-paper px-3 py-2 text-sm">
                This address is on the <Link href={`/suppressions?q=${encodeURIComponent(log.to)}`} className="text-brand underline">block list</Link>, so new emails to it won&apos;t be sent.
              </p>
            )}
          </section>

          {log.html ? (
            <section className="card overflow-hidden">
              <p className="border-b border-line px-5 py-3 text-sm font-medium">Saved copy (test mode)</p>
              {/* srcDoc: the copy is loaded with the page itself (no second request that a browser extension or dev compile could block) */}
              <iframe title="Email copy" sandbox="" srcDoc={log.html} className="block h-[640px] w-full bg-white" />
              <p className="border-t border-line px-5 py-2 text-xs text-muted">
                Not showing? <a href={`/api/admin/logs/${log.id}/html`} target="_blank" rel="noopener noreferrer" className="text-brand underline">Open the copy in a new tab</a>
              </p>
            </section>
          ) : (
            <section className="card p-5 text-sm text-muted">
              Live emails aren&apos;t stored in full because they can contain working login links. Use the template preview to see the design.
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section className="card p-5">
            <h2 className="section-title">What happened</h2>
            <ol className="mt-4 space-y-4 border-l border-line pl-5">
              {steps.map((s, i) => (
                <li key={i} className="relative">
                  <span className={`absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-white ${s.tone === "bad" ? "bg-danger" : "bg-brand"}`} aria-hidden="true" />
                  <p className={`text-sm ${s.tone === "bad" ? "text-danger" : ""}`}>{s.label}</p>
                  <p className="text-xs text-muted">{formatDateTime(s.at)}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="card p-5">
            <h2 className="section-title">Data sent</h2>
            <p className="mt-1 text-xs text-muted">Links and codes are hidden for security.</p>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-paper p-3 font-mono text-xs leading-relaxed">{JSON.stringify(data, null, 2)}</pre>
          </section>
        </aside>
      </div>
    </>
  );
}

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-0.5 break-words">{children}</dd>
    </div>
  );
}
