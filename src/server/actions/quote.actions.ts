"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { runUserAction } from "@/lib/action";
import { requireUser } from "@/lib/auth/dal";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { AppError } from "@/lib/errors";
import { formError, type FormState } from "@/lib/form";
import { idSchema } from "@/lib/validations/common";
import { createQuote, deleteQuote, duplicateQuote, quoteInputSchema, respondToQuote, sendQuote, updateQuote } from "@/server/quotes/quote.service";

export type QuoteFormState = (FormState & { id?: string }) | undefined;

/** Save (and optionally send) from the editor. Items arrive as JSON from the editor's state. */
export async function saveQuoteAction(_prev: QuoteFormState, formData: FormData): Promise<QuoteFormState> {
  let id: string;
  let sendAfter = false;
  try {
    const user = await requireUser(["ADMIN"]);
    const get = (k: string) => String(formData.get(k) ?? "").trim();
    let items: unknown;
    try {
      items = JSON.parse(get("items") || "[]");
    } catch {
      throw new AppError("VALIDATION", "Items could not be read. Reload the page and try again.");
    }
    const input = quoteInputSchema.parse({
      clientName: get("clientName"),
      clientEmail: get("clientEmail"),
      clientCompany: get("clientCompany") || undefined,
      title: get("title"),
      items,
      currency: get("currency"),
      taxPercent: get("taxPercent"),
      discount: get("discount") || 0,
      validUntil: get("validUntil") || undefined,
      notes: get("notes") || undefined,
      terms: get("terms") || undefined,
    });
    const existing = get("id");
    const saved = existing ? await updateQuote(idSchema.parse(existing), input) : await createQuote(input, user.id);
    id = saved.id;
    if (get("intent") === "send") {
      await sendQuote(id, get("message") || undefined);
      sendAfter = true;
    }
  } catch (err) {
    const state = formError(err);
    // items errors come back as "items.0.description" etc. → one readable line
    const itemErr = state?.fieldErrors && Object.entries(state.fieldErrors).find(([k]) => k.startsWith("items"));
    return itemErr ? { ...state, error: itemErr[1][0] ?? state?.error } : state;
  }
  revalidatePath("/quotes", "layout");
  redirect(`/quotes/${id}?${sendAfter ? "sent=1" : "saved=1"}`);
}

export async function sendQuoteAction(id: unknown, message: unknown) {
  return runUserAction(async () => {
    await sendQuote(idSchema.parse(id), typeof message === "string" ? message : undefined);
    revalidatePath("/quotes", "layout");
  }, ["ADMIN"]);
}

export async function duplicateQuoteAction(id: unknown) {
  const result = await runUserAction(async (u) => (await duplicateQuote(idSchema.parse(id), u.id)).id, ["ADMIN"]);
  if (result.ok) redirect(`/quotes/${result.data}?copied=1`);
  return result;
}

export async function deleteQuoteAction(id: unknown) {
  const result = await runUserAction(async () => deleteQuote(idSchema.parse(id)), ["ADMIN"]);
  if (result.ok) {
    revalidatePath("/quotes");
    redirect("/quotes?deleted=1");
  }
  return result;
}

// ─── Client answers on the public page ───────────────────────

export type RespondState = (FormState & { answered?: "ACCEPTED" | "DECLINED" }) | undefined;

export async function respondQuoteAction(_prev: RespondState, formData: FormData): Promise<RespondState> {
  try {
    const token = z.string().min(10).max(100).parse(formData.get("token"));
    const answer = z.enum(["ACCEPTED", "DECLINED"]).parse(formData.get("answer"));
    if (!checkRateLimit(`quote-answer:${token}`, 10, 60 * 60_000).ok) throw new AppError("RATE_LIMITED", "Too many tries. Please try again later.");
    await respondToQuote(token, answer, String(formData.get("note") ?? ""));
    revalidatePath(`/q/${token}`);
    return { ok: true, answered: answer };
  } catch (err) {
    return formError(err);
  }
}
