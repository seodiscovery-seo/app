"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MIN_PASSWORD_LENGTH, USER_ROLES } from "@/config/constants";
import { settingsSchemas, type SettingKey } from "@/config/settings";
import { getTemplateDef, TEMPLATE_KEYS } from "@/emails/registry";
import { runUserAction } from "@/lib/action";
import { requireUser } from "@/lib/auth/dal";
import { AppError } from "@/lib/errors";
import { formError, formToObject, type FormState } from "@/lib/form";
import { emailSchema, idSchema } from "@/lib/validations/common";
import { sendEmail } from "@/server/email/send";
import { createApiKey, revokeApiKey } from "@/server/services/apikey.service";
import { setSetting } from "@/server/services/settings.service";
import { suppress, unsuppress } from "@/server/services/suppression.service";
import { contentOverrideSchema, saveContentOverride, saveTemplateOverride } from "@/server/services/template.service";
import { createUser, updateUser } from "@/server/services/user.service";

const ADMIN = ["ADMIN"] as const;
const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

// ─── Settings ────────────────────────────────────────────────

export async function saveSettingsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await requireUser([...ADMIN]);
    const s = (k: string) => String(formData.get(k) ?? "").trim();
    const values: Partial<Record<SettingKey, unknown>> = {
      "brand.name": s("brand.name"),
      "brand.logoUrl": s("brand.logoUrl"),
      "brand.primaryColor": s("brand.primaryColor"),
      "brand.appUrl": s("brand.appUrl"),
      "brand.supportEmail": s("brand.supportEmail"),
      "brand.address": s("brand.address"),
      "sending.fromName": s("sending.fromName"),
      "sending.fromEmail": s("sending.fromEmail"),
      "sending.replyTo": s("sending.replyTo"),
      "sending.allowedLinkHosts": s("sending.allowedLinkHosts")
        .split(/[\s,]+/)
        .map((h) => h.replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase())
        .filter(Boolean),
      "logs.retentionDays": Number(s("logs.retentionDays") || 90),
      "auth.allowSignup": formData.get("auth.allowSignup") === "on",
      "auth.signupDomain": s("auth.signupDomain").replace(/^@/, "").toLowerCase(),
      "auth.loginAlerts": formData.get("auth.loginAlerts") === "on",
      "quotes.prefix": s("quotes.prefix") || "QT",
      "quotes.currency": s("quotes.currency") || "INR",
      "quotes.taxPercent": Number(s("quotes.taxPercent") || 0),
      "quotes.taxLabel": s("quotes.taxLabel") || "GST",
      "quotes.validDays": Number(s("quotes.validDays") || 15),
      "quotes.terms": String(formData.get("quotes.terms") ?? "").replace(/\r\n/g, "\n").trim(),
      "quotes.taxId": s("quotes.taxId"),
    };
    // Check everything first so a mistake never leaves settings half-saved
    const fieldErrors: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(values)) {
      const r = settingsSchemas[key as SettingKey].safeParse(value);
      if (!r.success) fieldErrors[key] = r.error.issues.map((i) => i.message);
    }
    if (Object.keys(fieldErrors).length) return { error: "Please fix the highlighted fields.", fieldErrors };
    for (const [key, value] of Object.entries(values)) await setSetting(key as SettingKey, value);
    revalidatePath("/", "layout");
    return { ok: true, message: "Settings saved." };
  } catch (err) {
    return formError(err);
  }
}

// ─── Templates ───────────────────────────────────────────────

const overrideSchema = z.object({
  key: z.enum(TEMPLATE_KEYS),
  subject: z.string().trim().max(200).optional(),
  preheader: z.string().trim().max(200).optional(),
  enabled: checkbox,
});

export async function saveTemplateAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const user = await requireUser([...ADMIN]);
    const raw = formToObject(formData);
    const input = overrideSchema.parse(raw);
    const def = getTemplateDef(input.key)!;
    const content = contentOverrideSchema.parse({ heading: raw.heading, body: raw.body?.replace(/\r\n/g, "\n"), button: raw.button, note: raw.note });
    // Store only what differs from the default wording
    const changed = Object.fromEntries(
      (Object.keys(content) as Array<keyof typeof content>)
        .filter((k) => content[k] !== undefined && content[k] !== def.content[k])
        .map((k) => [k, content[k]]),
    );
    await saveTemplateOverride(input.key, input, user.id);
    await saveContentOverride(input.key, changed, user.name);
    revalidatePath("/templates", "layout");
    return { ok: true, message: input.enabled ? "Saved. New emails will use this wording." : "Saved. This email is paused: your app's requests for it will be refused." };
  } catch (err) {
    return formError(err);
  }
}

export type TestSendState = (FormState & { logId?: string }) | undefined;

export async function sendTestAction(_prev: TestSendState, formData: FormData): Promise<TestSendState> {
  try {
    await requireUser([...ADMIN]);
    const raw = formToObject(formData);
    const to = emailSchema.parse(raw.to);
    const template = z.enum(TEMPLATE_KEYS).parse(raw.template);
    let data: unknown;
    try {
      data = JSON.parse(raw.data ?? "{}");
    } catch {
      throw new AppError("VALIDATION", "Sample data is not valid JSON. Check commas and quotes.");
    }
    const result = await sendEmail({ template, to, data, source: "admin-test" });
    revalidatePath("/logs");
    revalidatePath("/dashboard");
    if (!result.ok) return { error: result.issues?.length ? `Not sent: ${result.issues.join("; ")}` : `Not sent: ${result.error}`, logId: result.id };
    return {
      ok: true,
      logId: result.id,
      message: result.status === "TEST" ? `Created in test mode (not delivered). Open it in Logs to see it.` : `Sent to ${to}. Check the inbox and spam folder.`,
    };
  } catch (err) {
    return formError(err);
  }
}

// ─── Block list ──────────────────────────────────────────────

export async function addSuppressionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await requireUser([...ADMIN]);
    const raw = formToObject(formData);
    await suppress(emailSchema.parse(raw.email), "MANUAL", raw.detail);
    revalidatePath("/suppressions");
    return { ok: true, message: "Address blocked." };
  } catch (err) {
    return formError(err);
  }
}

export async function removeSuppressionAction(email: unknown) {
  return runUserAction(async () => {
    await unsuppress(emailSchema.parse(email));
    revalidatePath("/suppressions");
  }, [...ADMIN]);
}

// ─── API keys ────────────────────────────────────────────────

export type ApiKeyState = (FormState & { key?: string }) | undefined;

export async function createApiKeyAction(_prev: ApiKeyState, formData: FormData): Promise<ApiKeyState> {
  try {
    await requireUser([...ADMIN]);
    const name = z.string().trim().min(2, "Give the key a name, e.g. Website").max(60).parse(formData.get("name"));
    const { key } = await createApiKey(name);
    revalidatePath("/api-keys");
    return { ok: true, message: "Key created. Copy it now: it won't be shown again.", key };
  } catch (err) {
    return formError(err);
  }
}

export async function revokeApiKeyAction(id: unknown) {
  return runUserAction(async () => {
    await revokeApiKey(idSchema.parse(id));
    revalidatePath("/api-keys");
  }, [...ADMIN]);
}

// ─── Users ───────────────────────────────────────────────────

export async function createUserAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await requireUser([...ADMIN]);
    const input = z
      .object({
        name: z.string().trim().min(2, "Name is required").max(80),
        email: emailSchema,
        role: z.enum(USER_ROLES),
        password: z.string().min(MIN_PASSWORD_LENGTH, `At least ${MIN_PASSWORD_LENGTH} characters`).max(200),
      })
      .parse(formToObject(formData));
    await createUser(input);
    revalidatePath("/users");
    return { ok: true, message: `${input.name} can now sign in.` };
  } catch (err) {
    return formError(err);
  }
}

export async function updateUserAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireUser([...ADMIN]);
    const input = z
      .object({
        id: idSchema,
        role: z.enum(USER_ROLES),
        isActive: checkbox,
        password: z.string().min(MIN_PASSWORD_LENGTH, `At least ${MIN_PASSWORD_LENGTH} characters`).max(200).optional(),
      })
      .parse(formToObject(formData));
    await updateUser(actor.id, input);
    revalidatePath("/users");
    return { ok: true, message: "Saved." };
  } catch (err) {
    return formError(err);
  }
}

// ─── Send a document (quotation, invoice…) with files ────────

export type SendDocumentState = (FormState & { logId?: string; sentTo?: string }) | undefined;

const documentSchema = z.object({
  to: emailSchema,
  name: z.string().trim().min(1, "Enter the client's name").max(80),
  title: z.string().trim().min(2, "Give the document a title").max(120),
  message: z.string().trim().max(5000).optional(),
  actionUrl: z.union([z.string().trim().url("Enter a full link starting with https://"), z.literal("")]).optional(),
  buttonText: z.string().trim().max(40).optional(),
});

export async function sendDocumentAction(_prev: SendDocumentState, formData: FormData): Promise<SendDocumentState> {
  try {
    await requireUser([...ADMIN]);
    const raw = formToObject(formData);
    const input = documentSchema.parse({ ...raw, message: String(formData.get("message") ?? "").replace(/\r\n/g, "\n").trim() || undefined });
    const uploads = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    if (uploads.length === 0) throw new AppError("VALIDATION", "Attach at least one file (PDF, image, Word, Excel…).");
    const attachments = await Promise.all(uploads.map(async (f) => ({ filename: f.name, content: Buffer.from(await f.arrayBuffer()) })));

    const result = await sendEmail({
      template: "document",
      to: input.to,
      data: {
        name: input.name,
        title: input.title,
        ...(input.message ? { message: input.message } : {}),
        ...(input.actionUrl ? { actionUrl: input.actionUrl, ...(input.buttonText ? { buttonText: input.buttonText } : {}) } : {}),
      },
      attachments,
      source: "admin",
    });
    revalidatePath("/logs");
    revalidatePath("/dashboard");
    if (!result.ok) return { error: `Not sent: ${result.error}`, logId: result.id };
    return {
      ok: true,
      logId: result.id,
      sentTo: input.to,
      message: result.status === "TEST" ? "Created in test mode (not delivered)." : `Sent to ${input.to}.`,
    };
  } catch (err) {
    return formError(err);
  }
}
