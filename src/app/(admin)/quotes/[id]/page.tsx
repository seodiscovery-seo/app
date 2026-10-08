import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUserPage } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { cn, formatDateTime, toDateInput } from "@/lib/utils";
import { ActionButton } from "@/components/action-button";
import { PageHeader } from "@/components/page-header";
import { QuoteStatus } from "@/components/quote-status";
import { deleteQuoteAction, duplicateQuoteAction } from "@/server/actions/quote.actions";
import { displayStatus, parseItems } from "@/server/quotes/quote.service";
import { getSetting } from "@/server/services/settings.service";
import { QuoteEditor } from "../quote-editor";
import { CopyLink } from "./copy-link";

export const metadata: Metadata = { title: "Quotation" };

export default async function QuotePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; sent?: string; copied?: string }> }) {
  await requireUserPage(["ADMIN"]);
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const q = await db.quote.findUnique({ where: { id } });
  if (!q) notFound();
  const taxLabel = await getSetting("quotes.taxLabel");
  const shown = displayStatus(q);
  const locked = q.status === "ACCEPTED" || q.status === "DECLINED";
  const link = `${env.APP_URL}/q/${q.publicToken}`;

  const steps = [
    { label: "Created", at: q.createdAt, done: true },
    { label: "Sent to client", at: q.sentAt, done: !!q.sentAt },
    { label: "Client opened it", at: q.viewedAt, done: !!q.viewedAt },
    {
      label: q.status === "DECLINED" ? "Client declined" : "Client accepted",
      at: q.respondedAt,
      done: !!q.respondedAt,
      tone: q.status === "DECLINED" ? "bad" : "good",
    },
  ];

  return (
    <>
      <Link href="/quotes" className="text-sm font-medium text-muted hover:text-ink">← All quotations</Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <PageHeader title={q.number} description={q.title} />
      </div>
      {sp.sent && <Banner>Sent to {q.clientEmail}. You&apos;ll see here when they open and answer it.</Banner>}
      {sp.saved && <Banner>Saved.</Banner>}
      {sp.copied && <Banner>This is a copy with a new number. Change what you need, then send it.</Banner>}
      {q.status === "ACCEPTED" && <Banner tone="good">🎉 {q.clientName} accepted this quotation{q.responseNote ? `: “${q.responseNote}”` : "."}</Banner>}
      {q.status === "DECLINED" && <Banner tone="bad">{q.clientName} declined this quotation{q.responseNote ? `: “${q.responseNote}”` : "."}</Banner>}

      <QuoteEditor
        taxLabel={taxLabel}
        locked={locked}
        initial={{
          id: q.id,
          clientName: q.clientName,
          clientEmail: q.clientEmail,
          clientCompany: q.clientCompany ?? "",
          title: q.title,
          items: parseItems(q.items),
          currency: q.currency,
          taxPercent: q.taxPercent,
          discount: q.discount,
          validUntil: q.validUntil ? toDateInput(q.validUntil) : "",
          notes: q.notes ?? "",
          terms: q.terms ?? "",
        }}
        aside={
          <>
            <section className="card p-5">
              <div className="flex items-center justify-between">
                <h2 className="section-title">Status</h2>
                <QuoteStatus status={shown} />
              </div>
              <ol className="mt-4 space-y-3">
                {steps.map((s) => (
                  <li key={s.label} className="flex gap-3 text-sm">
                    <span
                      className={cn(
                        "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold",
                        !s.done ? "border-2 border-line" : s.tone === "bad" ? "bg-rose-500 text-white" : "bg-emerald-500 text-white",
                      )}
                      aria-hidden="true"
                    >
                      {s.done ? (s.tone === "bad" ? "✕" : "✓") : ""}
                    </span>
                    <span className={cn(!s.done && "text-muted")}>
                      {s.label}
                      {s.at && <span className="block text-xs text-muted">{formatDateTime(s.at)}</span>}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
            <section className="card space-y-2 p-5">
              <a href={`/api/admin/quotes/${q.id}/pdf`} target="_blank" rel="noopener noreferrer" className="btn-secondary w-full">View PDF</a>
              {q.status !== "DRAFT" && <CopyLink link={link} />}
              {q.lastEmailId && <Link href={`/logs/${q.lastEmailId}`} className="btn-ghost w-full">Email in logs</Link>}
              <ActionButton action={duplicateQuoteAction.bind(null, q.id)} className="btn-ghost w-full" pendingText="Copying…">Duplicate</ActionButton>
              {q.status === "DRAFT" && (
                <ActionButton action={deleteQuoteAction.bind(null, q.id)} confirm={`Delete draft ${q.number}?`} className="btn-ghost w-full text-danger">Delete draft</ActionButton>
              )}
            </section>
          </>
        }
      />
    </>
  );
}

function Banner({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "good" | "bad" }) {
  const cls = { info: "border-brand/20 bg-brand-soft text-[#173f99]", good: "border-emerald-200 bg-emerald-50 text-emerald-800", bad: "border-rose-200 bg-rose-50 text-rose-800" }[tone];
  return <p role="status" className={`mb-5 rounded-xl border px-4 py-3 text-sm font-medium ${cls}`}>{children}</p>;
}
