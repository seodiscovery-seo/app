/** Quote maths shared by the editor (browser) and the server, so totals always match. */
export type QuoteItem = { description: string; quantity: number; unitPrice: number };

const round2 = (n: number) => Math.round(n * 100) / 100;

export function quoteTotals(items: QuoteItem[], taxPercent: number, discount: number) {
  const subtotal = round2(items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0));
  const safeDiscount = Math.min(Math.max(0, Number(discount) || 0), subtotal);
  const taxable = round2(subtotal - safeDiscount);
  const tax = round2((taxable * (Number(taxPercent) || 0)) / 100);
  return { subtotal, discount: safeDiscount, taxable, tax, total: round2(taxable + tax) };
}

export function money(n: number, currency: string, opts: { symbol?: boolean } = { symbol: true }) {
  if (!opts.symbol) return `${currency} ${new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`;
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}
