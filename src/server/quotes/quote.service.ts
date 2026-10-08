import "server-only";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { emailSchema } from "@/lib/validations/common";
import { sendEmail } from "@/server/email/send";
import { buildQuotePdf, type PdfQuote } from "@/server/quotes/pdf";
import { money, quoteTotals, type QuoteItem } from "@/server/quotes/money";
import { getAllSettings } from "@/server/services/settings.service";

export const QUOTE_STATUSES = ["DRAFT", "SENT", "VIEWED", "ACCEPTED", "DECLINED"] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const quoteInputSchema = z.object({
  clientName: z.string().trim().min(1, "Enter the client's name").max(100),
  clientEmail: emailSchema,
  clientCompany: z.string().trim().max(120).optional(),
  title: z.string().trim().min(2, "Give the quotation a title").max(150),
  items: z
    .array(
      z.object({
        description: z.string().trim().min(1, "Describe each item").max(500),
        quantity: z.coerce.number().positive("Quantity must be more than 0").max(100000),
        unitPrice: z.coerce.number().min(0, "Price can't be negative").max(1_000_000_000),
      }),
    )
    .min(1, "Add at least one item")
    .max(50, "Up to 50 items"),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
  taxPercent: z.coerce.number().min(0).max(100),
  discount: z.coerce.number().min(0).max(1_000_000_000).default(0),
  validUntil: z.coerce.date().optional(),
  notes: z.string().trim().max(3000).optional(),
  terms: z.string().trim().max(3000).optional(),
});
export type QuoteInput = z.infer<typeof quoteInputSchema>;

export const parseItems = (json: string): QuoteItem[] => {
  try {
    return JSON.parse(json) as QuoteItem[];
  } catch {
    return [];
  }
};

/** Status the client effectively sees (an unanswered quote past its date is "expired"). */
export function displayStatus(q: { status: string; validUntil: Date | null }): QuoteStatus | "EXPIRED" {
  if (["SENT", "VIEWED", "DRAFT"].includes(q.status) && q.validUntil && q.validUntil.getTime() < new Date().setHours(0, 0, 0, 0)) {
    return q.status === "DRAFT" ? "DRAFT" : "EXPIRED";
  }
  return q.status as QuoteStatus;
}

async function nextNumber(): Promise<string> {
  const s = await getAllSettings();
  const year = new Date().getFullYear();
  const prefix = `${s["quotes.prefix"]}-${year}-`;
  const last = await db.quote.findFirst({ where: { number: { startsWith: prefix } }, orderBy: { number: "desc" }, select: { number: true } });
  const n = last ? Number(last.number.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(n).padStart(3, "0")}`;
}

function toData(input: QuoteInput) {
  const t = quoteTotals(input.items, input.taxPercent, input.discount);
  return {
    clientName: input.clientName,
    clientEmail: input.clientEmail.toLowerCase(),
    clientCompany: input.clientCompany || null,
    title: input.title,
    items: JSON.stringify(input.items),
    currency: input.currency,
    taxPercent: input.taxPercent,
    discount: t.discount,
    subtotal: t.subtotal,
    total: t.total,
    validUntil: input.validUntil ?? null,
    notes: input.notes || null,
    terms: input.terms || null,
  };
}

export async function createQuote(input: QuoteInput, userId: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db.quote.create({
        data: { ...toData(input), number: await nextNumber(), publicToken: randomBytes(18).toString("base64url"), createdById: userId },
      });
    } catch (err) {
      // two quotes created at the same moment got the same number: try the next one
      if ((err as { code?: string }).code !== "P2002" || attempt === 2) throw err;
    }
  }
  throw new AppError("CONFLICT", "Couldn't number the quotation. Try again.");
}

export async function updateQuote(id: string, input: QuoteInput) {
  const q = await db.quote.findUnique({ where: { id } });
  if (!q) throw new AppError("NOT_FOUND", "Quotation not found.");
  if (q.status === "ACCEPTED" || q.status === "DECLINED") {
    throw new AppError("VALIDATION", "This quotation has been answered by the client. Duplicate it to make a new version.");
  }
  return db.quote.update({ where: { id }, data: toData(input) });
}

export async function duplicateQuote(id: string, userId: string) {
  const q = await db.quote.findUnique({ where: { id } });
  if (!q) throw new AppError("NOT_FOUND", "Quotation not found.");
  const s = await getAllSettings();
  const valid = new Date();
  valid.setDate(valid.getDate() + s["quotes.validDays"]);
  return createQuote(
    {
      clientName: q.clientName,
      clientEmail: q.clientEmail,
      clientCompany: q.clientCompany ?? undefined,
      title: q.title,
      items: parseItems(q.items),
      currency: q.currency,
      taxPercent: q.taxPercent,
      discount: q.discount,
      validUntil: valid,
      notes: q.notes ?? undefined,
      terms: q.terms ?? undefined,
    },
    userId,
  );
}

export async function deleteQuote(id: string) {
  const q = await db.quote.findUnique({ where: { id } });
  if (!q) return;
  if (q.status !== "DRAFT") throw new AppError("VALIDATION", "Only drafts can be deleted. Sent quotations stay for your records.");
  await db.quote.delete({ where: { id } });
}

const clientLink = (token: string) => `${env.APP_URL}/q/${token}`;

function pdfQuote(q: Awaited<ReturnType<typeof db.quote.findUniqueOrThrow>>): PdfQuote {
  return {
    number: q.number,
    title: q.title,
    clientName: q.clientName,
    clientEmail: q.clientEmail,
    clientCompany: q.clientCompany,
    items: parseItems(q.items),
    currency: q.currency,
    taxPercent: q.taxPercent,
    discount: q.discount,
    validUntil: q.validUntil,
    notes: q.notes,
    terms: q.terms,
    createdAt: q.createdAt,
    link: clientLink(q.publicToken),
  };
}

export async function quotePdf(id: string) {
  const q = await db.quote.findUniqueOrThrow({ where: { id } });
  return { number: q.number, bytes: await buildQuotePdf(pdfQuote(q), await getAllSettings()) };
}

export async function quotePdfByToken(token: string) {
  const q = await db.quote.findUnique({ where: { publicToken: token } });
  if (!q || q.status === "DRAFT") return null;
  return { number: q.number, bytes: await buildQuotePdf(pdfQuote(q), await getAllSettings()) };
}

/** Emails the quotation with the PDF attached and a "View & accept" button. */
export async function sendQuote(id: string, message: string | undefined) {
  const q = await db.quote.findUniqueOrThrow({ where: { id } });
  if (q.status === "ACCEPTED" || q.status === "DECLINED") throw new AppError("VALIDATION", "This quotation is already answered.");
  const settings = await getAllSettings();
  const bytes = await buildQuotePdf(pdfQuote(q), settings);
  const total = money(q.total, q.currency);
  const result = await sendEmail({
    template: "document",
    to: q.clientEmail,
    data: {
      name: q.clientName,
      title: `Quotation ${q.number}: ${q.title}`.slice(0, 120),
      message:
        message?.trim() ||
        `Hi ${q.clientName},\n\nThank you for your interest. Your quotation for "${q.title}" is attached (total ${total}).\n\nYou can view it online and accept it with one click using the button below.`,
      actionUrl: clientLink(q.publicToken),
      buttonText: "View & accept quotation",
    },
    attachments: [{ filename: `${q.number}.pdf`, content: Buffer.from(bytes) }],
    source: "admin",
  });
  if (!result.ok) throw new AppError("VALIDATION", `Not sent: ${result.error}`);
  await db.quote.update({
    where: { id },
    data: { status: q.status === "DRAFT" ? "SENT" : q.status, sentAt: new Date(), lastEmailId: result.id },
  });
  logger.info("Quotation sent", { number: q.number, logId: result.id });
  return result;
}

// ─── Client side (public link) ───────────────────────────────

export async function viewQuoteByToken(token: string) {
  if (!token || token.length > 100) return null;
  const q = await db.quote.findUnique({ where: { publicToken: token } });
  if (!q || q.status === "DRAFT") return null;
  if (!q.viewedAt) {
    await db.quote.update({ where: { id: q.id }, data: { viewedAt: new Date(), ...(q.status === "SENT" ? { status: "VIEWED" } : {}) } });
  }
  return q;
}

export async function respondToQuote(token: string, answer: "ACCEPTED" | "DECLINED", note: string | undefined) {
  const q = await db.quote.findUnique({ where: { publicToken: token } });
  if (!q || q.status === "DRAFT") throw new AppError("NOT_FOUND", "This quotation link is not valid.");
  if (q.status === "ACCEPTED" || q.status === "DECLINED") throw new AppError("VALIDATION", "You've already answered this quotation. Thank you!");
  if (displayStatus(q) === "EXPIRED") throw new AppError("VALIDATION", "This quotation has expired. Please ask us for an updated one.");
  await db.quote.update({
    where: { id: q.id },
    data: { status: answer, respondedAt: new Date(), responseNote: note?.trim().slice(0, 1000) || null, viewedAt: q.viewedAt ?? new Date() },
  });
  logger.info("Quotation answered", { number: q.number, answer });
}

export async function quoteStats() {
  const rows = await db.quote.findMany({ select: { status: true, total: true, validUntil: true, respondedAt: true } });
  const open = rows.filter((r) => ["SENT", "VIEWED"].includes(displayStatus(r)));
  const accepted = rows.filter((r) => r.status === "ACCEPTED");
  const answered = rows.filter((r) => r.status === "ACCEPTED" || r.status === "DECLINED").length;
  return {
    openCount: open.length,
    openValue: open.reduce((s, r) => s + r.total, 0),
    acceptedValue: accepted.reduce((s, r) => s + r.total, 0),
    acceptRate: answered ? Math.round((accepted.length / answered) * 100) : null,
  };
}
