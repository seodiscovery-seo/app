"use client";

import Link from "next/link";
import { useActionState, useMemo, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { money, quoteTotals, type QuoteItem } from "@/server/quotes/money";
import { saveQuoteAction, type QuoteFormState } from "@/server/actions/quote.actions";

export type EditorQuote = {
  id?: string;
  clientName: string;
  clientEmail: string;
  clientCompany: string;
  title: string;
  items: QuoteItem[];
  currency: string;
  taxPercent: number;
  discount: number;
  validUntil: string;
  notes: string;
  terms: string;
};

type Row = QuoteItem & { key: number };
let seq = 0;
const toRows = (items: QuoteItem[]) => items.map((i) => ({ ...i, key: ++seq }));

export function QuoteEditor({ initial, taxLabel, locked, aside }: { initial: EditorQuote; taxLabel: string; locked: boolean; aside?: ReactNode }) {
  const [state, formAction, pending] = useActionState<QuoteFormState, FormData>(saveQuoteAction, undefined);
  const [, start] = useTransition();
  const [v, setV] = useState(initial);
  const [rows, setRows] = useState<Row[]>(toRows(initial.items.length ? initial.items : [{ description: "", quantity: 1, unitPrice: 0 }]));
  const [message, setMessage] = useState("");
  const [intent, setIntent] = useState<"save" | "send">("save");
  const t = useMemo(() => quoteTotals(rows, v.taxPercent, v.discount), [rows, v.taxPercent, v.discount]);
  const set = <K extends keyof EditorQuote>(k: K) => (e: { target: { value: string } }) =>
    setV((p) => ({ ...p, [k]: k === "taxPercent" || k === "discount" ? Number(e.target.value) : e.target.value }));
  const setRow = (key: number, patch: Partial<QuoteItem>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const fe = state?.fieldErrors;

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    if (v.id) fd.set("id", v.id);
    (["clientName", "clientEmail", "clientCompany", "title", "currency", "validUntil", "notes", "terms"] as const).forEach((k) => fd.set(k, String(v[k] ?? "")));
    fd.set("taxPercent", String(v.taxPercent));
    fd.set("discount", String(v.discount || 0));
    fd.set("items", JSON.stringify(rows.map(({ description, quantity, unitPrice }) => ({ description, quantity, unitPrice }))));
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const i = submitter?.value === "send" ? "send" : "save";
    setIntent(i);
    fd.set("intent", i);
    fd.set("message", message);
    start(() => formAction(fd));
  }

  const err = (k: string) => fe?.[k]?.[0] && <p className="mt-1.5 text-xs font-medium text-danger">{fe[k]![0]}</p>;

  return (
    <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]" noValidate>
      <div className="space-y-6">
        {state?.error && <p role="alert" className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm font-medium text-danger">{state.error}</p>}
        <fieldset disabled={locked} className="space-y-6">
          <section className="card p-6">
            <h2 className="section-title">1. Client</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="clientName" className="label">Name</label>
                <input id="clientName" value={v.clientName} onChange={set("clientName")} className="input" placeholder="Rohit Sharma" />
                {err("clientName")}
              </div>
              <div>
                <label htmlFor="clientEmail" className="label">Email</label>
                <input id="clientEmail" type="email" value={v.clientEmail} onChange={set("clientEmail")} className="input" placeholder="rohit@acme.in" />
                {err("clientEmail")}
              </div>
              <div>
                <label htmlFor="clientCompany" className="label">Company <span className="font-normal text-muted">(optional)</span></label>
                <input id="clientCompany" value={v.clientCompany} onChange={set("clientCompany")} className="input" placeholder="Acme Pvt Ltd" />
              </div>
            </div>
            <div className="mt-4">
              <label htmlFor="title" className="label">What is this quotation for?</label>
              <input id="title" value={v.title} onChange={set("title")} className="input" placeholder="SEO services for 6 months" />
              {err("title")}
            </div>
          </section>

          <section className="card overflow-hidden">
            <div className="flex items-center justify-between px-6 pt-6">
              <h2 className="section-title">2. Items</h2>
              <p className="text-xs text-muted">Amount = quantity × price</p>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="border-y border-line bg-paper/60">
                  <tr>
                    <th className="th w-[52%]">Description</th>
                    <th className="th w-[12%] text-right">Qty</th>
                    <th className="th w-[18%] text-right">Price ({v.currency})</th>
                    <th className="th text-right">Amount</th>
                    <th className="th w-10"><span className="sr-only">Remove</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((r, i) => (
                    <tr key={r.key}>
                      <td className="px-3 py-2">
                        <textarea
                          rows={Math.min(4, Math.max(1, Math.ceil((r.description.length || 1) / 48)))}
                          value={r.description}
                          onChange={(e) => setRow(r.key, { description: e.target.value })}
                          className="input min-h-10 resize-y"
                          placeholder={i === 0 ? "e.g. On-page SEO for 20 pages" : "Item description"}
                          aria-label={`Item ${i + 1} description`}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" min={0} step="any" value={r.quantity} onChange={(e) => setRow(r.key, { quantity: Number(e.target.value) })} className="input text-right tabular-nums" aria-label={`Item ${i + 1} quantity`} />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" min={0} step="any" value={r.unitPrice} onChange={(e) => setRow(r.key, { unitPrice: Number(e.target.value) })} className="input text-right tabular-nums" aria-label={`Item ${i + 1} price`} />
                      </td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums">{money((r.quantity || 0) * (r.unitPrice || 0), v.currency)}</td>
                      <td className="px-2 py-2 text-center">
                        <button type="button" disabled={rows.length === 1} onClick={() => setRows(rows.filter((x) => x.key !== r.key))} className="btn-ghost btn-sm" aria-label={`Remove item ${i + 1}`}>
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4">
              <button type="button" onClick={() => setRows([...rows, { key: ++seq, description: "", quantity: 1, unitPrice: 0 }])} className="btn-secondary btn-sm">+ Add item</button>
            </div>
          </section>

          <section className="card p-6">
            <h2 className="section-title">3. Price, tax and validity</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-4">
              <div>
                <label htmlFor="discount" className="label">Discount</label>
                <input id="discount" type="number" min={0} step="any" value={v.discount} onChange={set("discount")} className="input tabular-nums" />
              </div>
              <div>
                <label htmlFor="taxPercent" className="label">{taxLabel} %</label>
                <input id="taxPercent" type="number" min={0} max={100} step="any" value={v.taxPercent} onChange={set("taxPercent")} className="input tabular-nums" />
              </div>
              <div>
                <label htmlFor="currency" className="label">Currency</label>
                <input id="currency" value={v.currency} onChange={set("currency")} maxLength={3} className="input uppercase" />
              </div>
              <div>
                <label htmlFor="validUntil" className="label">Valid until</label>
                <input id="validUntil" type="date" value={v.validUntil} onChange={set("validUntil")} className="input" />
              </div>
            </div>
          </section>

          <section className="card p-6">
            <h2 className="section-title">4. Notes and terms <span className="font-normal text-muted">(shown on the PDF)</span></h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="notes" className="label">Notes</label>
                <textarea id="notes" rows={5} value={v.notes} onChange={set("notes")} className="input" placeholder="What's included, timelines, anything the client should know" />
              </div>
              <div>
                <label htmlFor="terms" className="label">Terms</label>
                <textarea id="terms" rows={5} value={v.terms} onChange={set("terms")} className="input" />
              </div>
            </div>
          </section>
        </fieldset>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-20 xl:h-fit">
        <section className="card p-5">
          <h2 className="section-title">Summary</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="tabular-nums">{money(t.subtotal, v.currency)}</dd></div>
            {t.discount > 0 && <div className="flex justify-between"><dt className="text-muted">Discount</dt><dd className="tabular-nums">− {money(t.discount, v.currency)}</dd></div>}
            <div className="flex justify-between"><dt className="text-muted">{taxLabel} ({v.taxPercent}%)</dt><dd className="tabular-nums">{money(t.tax, v.currency)}</dd></div>
            <div className="flex justify-between border-t border-line pt-3 text-base"><dt className="font-bold">Total</dt><dd className="font-bold tabular-nums">{money(t.total, v.currency)}</dd></div>
          </dl>
          {!locked && (
            <div className="mt-5 space-y-3">
              <button type="submit" name="intent" value="save" disabled={pending} className="btn-secondary w-full">
                {pending && intent === "save" ? "Saving…" : v.id ? "Save changes" : "Save as draft"}
              </button>
              <div className="rounded-xl border border-line p-3">
                <label htmlFor="message" className="text-xs font-semibold">Message to the client <span className="font-normal text-muted">(optional)</span></label>
                <textarea id="message" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} className="input mt-1.5 text-sm" placeholder="Leave empty for a ready-made friendly message" />
                <button type="submit" name="intent" value="send" disabled={pending} className={cn("btn-primary mt-3 w-full")}>
                  {pending && intent === "send" ? "Sending…" : "Save & send to client"}
                </button>
                <p className="mt-2 text-xs text-muted">Emails the PDF with a &ldquo;View &amp; accept&rdquo; button.</p>
              </div>
            </div>
          )}
          {locked && <p className="mt-4 rounded-xl bg-paper px-3 py-2 text-xs text-muted">The client has answered this quotation, so it can&apos;t be changed. Use Duplicate to make a new version.</p>}
        </section>
        {aside}
        {!v.id && <Link href="/quotes" className="btn-ghost w-full">Cancel</Link>}
      </aside>
    </form>
  );
}
