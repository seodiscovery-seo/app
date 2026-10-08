import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatDate, initials } from "@/lib/utils";
import { QuoteStatus } from "@/components/quote-status";
import { money, quoteTotals } from "@/server/quotes/money";
import { displayStatus, parseItems, viewQuoteByToken } from "@/server/quotes/quote.service";
import { getAllSettings } from "@/server/services/settings.service";
import { RespondForm } from "./respond-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Quotation", robots: { index: false, follow: false } };

export default async function ClientQuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [q, s] = await Promise.all([viewQuoteByToken(token), getAllSettings()]);
  if (!q) notFound();
  const items = parseItems(q.items);
  const t = quoteTotals(items, q.taxPercent, q.discount);
  const shown = displayStatus(q);
  const brand = s["brand.name"];

  return (
    <main className="min-h-screen bg-paper py-8 sm:py-12">
      <div className="mx-auto max-w-3xl px-4">
        <header className="mb-6 flex items-center gap-3">
          {s["brand.logoUrl"] ? (
            <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-xl bg-white p-1 ring-1 ring-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s["brand.logoUrl"]} alt="" className="max-h-full max-w-full object-contain" />
            </span>
          ) : (
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-navy font-bold text-white">{initials(brand)}</span>
          )}
          <div>
            <p className="font-bold">{brand}</p>
            {s["brand.supportEmail"] && <p className="text-xs text-muted">{s["brand.supportEmail"]}</p>}
          </div>
        </header>

        <article className="card overflow-hidden">
          <div className="h-1.5" style={{ backgroundColor: s["brand.primaryColor"] }} />
          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold tracking-wide text-muted">QUOTATION {q.number}</p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight">{q.title}</h1>
                <p className="mt-1 text-sm text-muted">Prepared for {q.clientName}{q.clientCompany ? `, ${q.clientCompany}` : ""}</p>
              </div>
              {["ACCEPTED", "DECLINED", "EXPIRED"].includes(shown) && <QuoteStatus status={shown} />}
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-3 rounded-xl bg-paper p-4 text-sm sm:grid-cols-3">
              <div><dt className="text-xs text-muted">Date</dt><dd className="font-semibold">{formatDate(q.createdAt)}</dd></div>
              <div><dt className="text-xs text-muted">Valid until</dt><dd className="font-semibold">{formatDate(q.validUntil)}</dd></div>
              <div className="col-span-2 sm:col-span-1"><dt className="text-xs text-muted">Total</dt><dd className="text-lg font-bold">{money(q.total, q.currency)}</dd></div>
            </dl>

            {/* Phone: stacked list */}
            <ul className="mt-6 divide-y divide-line border-y border-line sm:hidden">
              {items.map((i, n) => (
                <li key={n} className="py-3 text-sm">
                  <p className="whitespace-pre-line font-medium">{i.description}</p>
                  <p className="mt-1 flex justify-between text-muted">
                    <span className="tabular-nums">{i.quantity} × {money(i.unitPrice, q.currency)}</span>
                    <span className="font-semibold tabular-nums text-ink">{money(i.quantity * i.unitPrice, q.currency)}</span>
                  </p>
                </li>
              ))}
            </ul>

            {/* Tablet and desktop: table */}
            <div className="mt-6 hidden sm:block">
              <table className="w-full text-sm">
                <thead className="border-b border-line">
                  <tr>
                    <th className="th pl-0">Item</th>
                    <th className="th text-right">Qty</th>
                    <th className="th text-right">Price</th>
                    <th className="th pr-0 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {items.map((i, n) => (
                    <tr key={n}>
                      <td className="td whitespace-pre-line pl-0">{i.description}</td>
                      <td className="td text-right tabular-nums">{i.quantity}</td>
                      <td className="td text-right tabular-nums">{money(i.unitPrice, q.currency)}</td>
                      <td className="td pr-0 text-right font-semibold tabular-nums">{money(i.quantity * i.unitPrice, q.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <dl className="ml-auto mt-4 max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="tabular-nums">{money(t.subtotal, q.currency)}</dd></div>
              {t.discount > 0 && <div className="flex justify-between"><dt className="text-muted">Discount</dt><dd className="tabular-nums">− {money(t.discount, q.currency)}</dd></div>}
              <div className="flex justify-between"><dt className="text-muted">{s["quotes.taxLabel"]} ({q.taxPercent}%)</dt><dd className="tabular-nums">{money(t.tax, q.currency)}</dd></div>
              <div className="flex justify-between border-t border-line pt-2 text-base font-bold"><dt>Total</dt><dd className="tabular-nums">{money(t.total, q.currency)}</dd></div>
            </dl>

            {(q.notes || q.terms) && (
              <div className="mt-8 grid gap-6 border-t border-line pt-6 text-sm sm:grid-cols-2">
                {q.notes && <div><h2 className="text-xs font-bold text-muted">NOTES</h2><p className="mt-1.5 whitespace-pre-line">{q.notes}</p></div>}
                {q.terms && <div><h2 className="text-xs font-bold text-muted">TERMS</h2><p className="mt-1.5 whitespace-pre-line">{q.terms}</p></div>}
              </div>
            )}
          </div>

          <div className="border-t border-line bg-paper/60 p-6 sm:p-8">
            <RespondForm token={token} status={shown} clientName={q.clientName} answeredNote={q.responseNote} />
            <a href={`/q/${token}/pdf`} className="btn-ghost mt-4 w-full">Download PDF</a>
          </div>
        </article>
        <p className="mt-6 text-center text-xs text-muted">Questions? Reply to the email you received{s["brand.supportEmail"] ? ` or write to ${s["brand.supportEmail"]}` : ""}.</p>
      </div>
    </main>
  );
}
