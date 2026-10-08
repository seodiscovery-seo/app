/**
 * Branded quotation PDF (A4) built with pdf-lib: pure JavaScript, works offline.
 * Standard PDF fonts can't draw every character (e.g. ₹ or Hindi), so text is cleaned to Latin characters
 * and amounts are written as "INR 25,000.00".
 */
import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import type { SettingsMap } from "@/config/settings";
import { money, quoteTotals, type QuoteItem } from "@/server/quotes/money";

export type PdfQuote = {
  number: string;
  title: string;
  clientName: string;
  clientEmail: string;
  clientCompany: string | null;
  items: QuoteItem[];
  currency: string;
  taxPercent: number;
  discount: number;
  validUntil: Date | null;
  notes: string | null;
  terms: string | null;
  createdAt: Date;
  link?: string;
};

const W = 595.28;
const H = 841.89;
const M = 48;

function clean(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/₹/g, "Rs.")
    .replace(/…/g, "...")
    .replace(/[^\x09\x0a\x0d\x20-\x7e\xa0-\xff]/g, "?");
}

function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.replace("#", ""), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const out: string[] = [];
  for (const para of clean(text).split(/\n/)) {
    let line = "";
    for (const word of para.split(/\s+/)) {
      const test = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) <= width) line = test;
      else {
        if (line) out.push(line);
        // very long word: hard-split
        let w = word;
        while (font.widthOfTextAtSize(w, size) > width && w.length > 1) {
          let cut = w.length;
          while (cut > 1 && font.widthOfTextAtSize(w.slice(0, cut), size) > width) cut--;
          out.push(w.slice(0, cut));
          w = w.slice(cut);
        }
        line = w;
      }
    }
    out.push(line);
  }
  return out;
}

const fmtDate = (d: Date) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(d);

async function fetchLogo(url: string): Promise<{ bytes: Uint8Array; type: "png" | "jpg" } | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes[0] === 0x89 && bytes[1] === 0x50) return { bytes, type: "png" };
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return { bytes, type: "jpg" };
    return null; // webp/svg can't be embedded in a PDF: the brand name is used instead
  } catch {
    return null;
  }
}

export async function buildQuotePdf(q: PdfQuote, s: SettingsMap): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`${q.number} - ${clean(q.title)}`);
  doc.setAuthor(clean(s["brand.name"]));
  doc.setCreator("Email App");
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const brand = hexToRgb(s["brand.primaryColor"]);
  const ink = rgb(0.07, 0.1, 0.2);
  const muted = rgb(0.39, 0.44, 0.52);
  const line = rgb(0.89, 0.91, 0.94);
  const soft = rgb(0.965, 0.972, 0.984);
  const cur = q.currency;
  const t = quoteTotals(q.items, q.taxPercent, q.discount);

  let page: PDFPage = doc.addPage([W, H]);
  let y = H;
  const pages: PDFPage[] = [page];
  const text = (str: string, x: number, yy: number, o: { size?: number; font?: PDFFont; color?: RGB; right?: boolean } = {}) => {
    const size = o.size ?? 10;
    const font = o.font ?? regular;
    const c = clean(str);
    const xx = o.right ? x - font.widthOfTextAtSize(c, size) : x;
    page.drawText(c, { x: xx, y: yy, size, font, color: o.color ?? ink });
  };
  const newPage = () => {
    page = doc.addPage([W, H]);
    pages.push(page);
    page.drawRectangle({ x: 0, y: H - 6, width: W, height: 6, color: brand });
    y = H - M;
  };
  const need = (h: number) => {
    if (y - h < 70) newPage();
  };

  // Header
  page.drawRectangle({ x: 0, y: H - 6, width: W, height: 6, color: brand });
  y = H - M;
  const logo = await fetchLogo(s["brand.logoUrl"]);
  if (logo) {
    const img = logo.type === "png" ? await doc.embedPng(logo.bytes) : await doc.embedJpg(logo.bytes);
    const scale = Math.min(150 / img.width, 44 / img.height);
    page.drawImage(img, { x: M, y: y - img.height * scale + 4, width: img.width * scale, height: img.height * scale });
  } else {
    text(s["brand.name"], M, y - 16, { size: 20, font: bold });
  }
  text("QUOTATION", W - M, y - 10, { size: 22, font: bold, color: brand, right: true });
  text(q.number, W - M, y - 28, { size: 11, font: bold, right: true });
  y -= 64;

  // Meta row
  page.drawRectangle({ x: M, y: y - 52, width: W - 2 * M, height: 52, color: soft });
  const meta: Array<[string, string]> = [
    ["Date", fmtDate(q.createdAt)],
    ["Valid until", q.validUntil ? fmtDate(q.validUntil) : "-"],
    ["Amount", money(t.total, cur, { symbol: false })],
  ];
  meta.forEach(([k, v], i) => {
    const x = M + 16 + i * ((W - 2 * M) / 3);
    text(k.toUpperCase(), x, y - 20, { size: 7.5, font: bold, color: muted });
    text(v, x, y - 36, { size: 11, font: bold });
  });
  y -= 76;

  // From / To
  const col = (W - 2 * M) / 2;
  text("FROM", M, y, { size: 7.5, font: bold, color: muted });
  text("PREPARED FOR", M + col, y, { size: 7.5, font: bold, color: muted });
  y -= 15;
  const from = [s["brand.name"], s["brand.address"], s["brand.supportEmail"], s["quotes.taxId"] ? `${s["quotes.taxLabel"]} No: ${s["quotes.taxId"]}` : ""].filter(Boolean);
  const to = [q.clientName, q.clientCompany ?? "", q.clientEmail].filter(Boolean);
  // wrap each column separately, then draw line by line (first line of each column in bold)
  const lay = (list: string[]) =>
    list.flatMap((str, i) => wrap(str, i === 0 ? bold : regular, 10, col - 20).map((l) => ({ l, first: i === 0 })));
  const fromLines = lay(from);
  const toLines = lay(to);
  for (let i = 0; i < Math.max(fromLines.length, toLines.length); i++) {
    const a = fromLines[i];
    const b = toLines[i];
    if (a) text(a.l, M, y, { font: a.first ? bold : regular, color: a.first ? ink : muted });
    if (b) text(b.l, M + col, y, { font: b.first ? bold : regular, color: b.first ? ink : muted });
    y -= 14;
  }
  y -= 14;

  // Title
  for (const l of wrap(q.title, bold, 14, W - 2 * M)) {
    text(l, M, y, { size: 14, font: bold });
    y -= 18;
  }
  y -= 8;

  // Items table
  // right edges of the number columns (numbers are right-aligned so they never overlap)
  const cx = { desc: M + 10, qty: M + 292, price: M + 400, amount: W - M - 10 };
  const descWidth = 228;
  const header = () => {
    page.drawRectangle({ x: M, y: y - 22, width: W - 2 * M, height: 22, color: brand });
    text("DESCRIPTION", cx.desc, y - 15, { size: 8, font: bold, color: rgb(1, 1, 1) });
    text("QTY", cx.qty, y - 15, { size: 8, font: bold, color: rgb(1, 1, 1), right: true });
    text("UNIT PRICE", cx.price, y - 15, { size: 8, font: bold, color: rgb(1, 1, 1), right: true });
    text("AMOUNT", cx.amount, y - 15, { size: 8, font: bold, color: rgb(1, 1, 1), right: true });
    y -= 22;
  };
  header();
  q.items.forEach((item, idx) => {
    const lines = wrap(item.description || "-", regular, 10, descWidth);
    const h = Math.max(26, lines.length * 13 + 13);
    if (y - h < 90) {
      newPage();
      header();
    }
    if (idx % 2 === 1) page.drawRectangle({ x: M, y: y - h, width: W - 2 * M, height: h, color: soft });
    lines.forEach((l, i) => text(l, cx.desc, y - 17 - i * 13));
    text(String(item.quantity), cx.qty, y - 17, { right: true });
    text(money(item.unitPrice, cur, { symbol: false }), cx.price, y - 17, { right: true });
    text(money(item.quantity * item.unitPrice, cur, { symbol: false }), cx.amount, y - 17, { right: true, font: bold });
    y -= h;
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.5, color: line });
  });
  y -= 14;

  // Totals
  need(110);
  const tx = W - M - 220;
  const totalRow = (label: string, value: string, strong = false) => {
    text(label, tx, y, { size: strong ? 11 : 10, font: strong ? bold : regular, color: strong ? ink : muted });
    text(value, W - M - 10, y, { size: strong ? 11 : 10, font: bold, right: true });
    y -= strong ? 0 : 17;
  };
  totalRow("Subtotal", money(t.subtotal, cur, { symbol: false }));
  if (t.discount > 0) totalRow("Discount", `- ${money(t.discount, cur, { symbol: false })}`);
  totalRow(`${s["quotes.taxLabel"]} (${q.taxPercent}%)`, money(t.tax, cur, { symbol: false }));
  y -= 8; // keep the tax line clear of the total box
  page.drawRectangle({ x: tx - 10, y: y - 20, width: W - M - tx + 10, height: 30, color: brand });
  text("Total", tx, y - 10, { size: 12, font: bold, color: rgb(1, 1, 1) });
  text(money(t.total, cur, { symbol: false }), W - M - 10, y - 10, { size: 12, font: bold, color: rgb(1, 1, 1), right: true });
  y -= 50;

  // Notes & terms
  const block = (title: string, body: string | null) => {
    if (!body?.trim()) return;
    const lines = wrap(body, regular, 9.5, W - 2 * M);
    need(28 + lines.length * 13);
    text(title.toUpperCase(), M, y, { size: 7.5, font: bold, color: muted });
    y -= 15;
    for (const l of lines) {
      need(14);
      text(l, M, y, { size: 9.5, color: ink });
      y -= 13;
    }
    y -= 12;
  };
  block("Notes", q.notes);
  block("Terms", q.terms);

  if (q.link) {
    need(40);
    page.drawRectangle({ x: M, y: y - 26, width: W - 2 * M, height: 32, color: soft });
    text("Accept this quotation online:", M + 12, y - 14, { size: 9.5, font: bold });
    text(q.link, M + 150, y - 14, { size: 9.5, color: brand });
    y -= 40;
  }

  // Footer on every page
  pages.forEach((p, i) => {
    page = p;
    page.drawLine({ start: { x: M, y: 46 }, end: { x: W - M, y: 46 }, thickness: 0.5, color: line });
    text(`${s["brand.name"]}${s["brand.supportEmail"] ? `  ·  ${s["brand.supportEmail"]}` : ""}`.replace("·", "-"), M, 32, { size: 8, color: muted });
    text(`${q.number}  -  Page ${i + 1} of ${pages.length}`, W - M, 32, { size: 8, color: muted, right: true });
  });

  return doc.save();
}
