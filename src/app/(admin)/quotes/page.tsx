import type { Metadata } from "next";
import Link from "next/link";
import { requireUserPage } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { cn, formatDate } from "@/lib/utils";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { QuoteStatus } from "@/components/quote-status";
import { money } from "@/server/quotes/money";
import { displayStatus, quoteStats } from "@/server/quotes/quote.service";
import { getSetting } from "@/server/services/settings.service";

export const metadata: Metadata = { title: "Quotations" };

const TABS = [
  { key: "", label: "All" },
  { key: "DRAFT", label: "Drafts" },
  { key: "OPEN", label: "Waiting for client" },
  { key: "ACCEPTED", label: "Accepted" },
  { key: "DECLINED", label: "Declined" },
];

export default async function QuotesPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string; deleted?: string }> }) {
  await requireUserPage(["ADMIN"]);
  const sp = await searchParams;
  const [all, stats, currency] = await Promise.all([
    db.quote.findMany({
      where: sp.q ? { OR: [{ clientName: { contains: sp.q } }, { clientEmail: { contains: sp.q.toLowerCase() } }, { number: { contains: sp.q.toUpperCase() } }, { title: { contains: sp.q } }] } : {},
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
    quoteStats(),
    getSetting("quotes.currency"),
  ]);
  const rows = all
    .map((q) => ({ ...q, shown: displayStatus(q) }))
    .filter((q) => !sp.tab || (sp.tab === "OPEN" ? ["SENT", "VIEWED", "EXPIRED"].includes(q.shown) : q.shown === sp.tab));

  return (
    <>
      <PageHeader
        title="Quotations"
        description="Create a quotation, send it as a branded PDF, and see when the client opens and accepts it."
        actions={<Link href="/quotes/new" className="btn-primary">+ New quotation</Link>}
      />
      {sp.deleted && <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">Draft deleted.</p>}

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="card px-5 py-4">
          <p className="text-xs font-semibold text-muted">Waiting for client</p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums">{money(stats.openValue, currency)}</p>
          <p className="text-xs text-muted">{stats.openCount} quotation{stats.openCount === 1 ? "" : "s"}</p>
        </div>
        <div className="card px-5 py-4">
          <p className="text-xs font-semibold text-muted">Accepted (all time)</p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums text-good">{money(stats.acceptedValue, currency)}</p>
        </div>
        <div className="card px-5 py-4">
          <p className="text-xs font-semibold text-muted">Acceptance rate</p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums">{stats.acceptRate === null ? "—" : `${stats.acceptRate}%`}</p>
          <p className="text-xs text-muted">of answered quotations</p>
        </div>
      </section>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap gap-1 rounded-xl border border-line bg-white p-1 text-sm" aria-label="Filter quotations">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={t.key ? `/quotes?tab=${t.key}` : "/quotes"}
              aria-current={(sp.tab ?? "") === t.key ? "page" : undefined}
              className={cn("rounded-lg px-3 py-1.5 font-semibold", (sp.tab ?? "") === t.key ? "bg-navy text-white" : "text-muted hover:text-ink")}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        <form method="get" className="flex gap-2">
          {sp.tab && <input type="hidden" name="tab" value={sp.tab} />}
          <input name="q" defaultValue={sp.q} placeholder="Client, number or title" className="input w-60" aria-label="Search quotations" />
        </form>
      </div>

      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState
            title={all.length === 0 ? "No quotations yet" : "Nothing here"}
            text={all.length === 0 ? "Create your first quotation: add the client, the items and the price. The PDF is made for you." : "Try another filter."}
            action={<Link href="/quotes/new" className="btn-primary">+ New quotation</Link>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-line bg-paper/60">
                <tr>
                  <th className="th">Quotation</th>
                  <th className="th">Client</th>
                  <th className="th text-right">Total</th>
                  <th className="th">Status</th>
                  <th className="th">Valid until</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((q) => (
                  <tr key={q.id} className="hover:bg-paper/60">
                    <td className="td">
                      <Link href={`/quotes/${q.id}`} className="font-bold hover:text-brand">{q.number}</Link>
                      <p className="max-w-xs truncate text-xs text-muted">{q.title}</p>
                    </td>
                    <td className="td">
                      <p className="font-medium">{q.clientName}</p>
                      <p className="text-xs text-muted">{q.clientCompany || q.clientEmail}</p>
                    </td>
                    <td className="td text-right font-semibold tabular-nums">{money(q.total, q.currency)}</td>
                    <td className="td"><QuoteStatus status={q.shown} /></td>
                    <td className="td text-muted">{formatDate(q.validUntil)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
