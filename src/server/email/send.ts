/**
 * sendEmail(): the ONE function that sends an email.
 *  1. checks the template is on and the address isn't blocked
 *  2. validates the data and renders the design
 *  3. sends through the provider with up to 3 attempts
 *  4. saves a log row (links masked)
 * It never throws, so a failing email can't break sign-up or login in your app.
 */
import "server-only";
import { getTemplateDef } from "@/emails/registry";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";
import { isEmail } from "@/lib/utils";
import { maskData } from "@/server/email/mask";
import { prepareAttachments, toMeta, type AttachmentInput, type CleanAttachment } from "@/server/email/attachments";
import { getProvider } from "@/server/email/providers";
import { renderTemplate, TemplateDataError } from "@/server/email/render";
import { cleanupOldLogs } from "@/server/services/log.service";
import { getAllSettings } from "@/server/services/settings.service";
import { getContentOverride } from "@/server/services/template.service";

export type SendInput = {
  template: string;
  to: string;
  data: unknown;
  /** Same key twice = the email is sent only once (e.g. "reset:user_123:token_abc") */
  idempotencyKey?: string;
  source?: "api" | "admin-test" | "admin" | "system";
  apiKeyId?: string;
  /** files to attach (only for emails that allow attachments, e.g. "document") */
  attachments?: AttachmentInput[];
};

export type SendResult =
  | { ok: true; id: string; status: "SENT" | "TEST"; providerId: string; duplicate?: boolean }
  | { ok: false; id?: string; status: "FAILED" | "SUPPRESSED" | "INVALID" | "PAUSED"; error: string; issues?: string[] };

/** Requests we refused (bad data, paused) are logged too, so you can see what your app sent wrong. */
async function logRejected(templateKey: string, to: string, error: string, input: SendInput): Promise<string> {
  const row = await db.emailLog.create({
    data: {
      templateKey,
      to,
      subject: "(not sent)",
      status: "FAILED",
      provider: "none",
      error: error.slice(0, 1000),
      source: input.source ?? "api",
      apiKeyId: input.apiKeyId ?? null,
    },
  });
  return row.id;
}

const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [0, 600, 1800];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function sendEmail(input: SendInput): Promise<SendResult> {
  try {
    return await sendInner(input);
  } catch (err) {
    logger.error("sendEmail crashed", { error: err, template: input.template });
    return { ok: false, status: "FAILED", error: "Unexpected error while sending. Check the server logs." };
  }
}

async function sendInner(input: SendInput): Promise<SendResult> {
  const to = String(input.to ?? "").trim().toLowerCase();
  const source = input.source ?? "api";

  // 0. Basic checks
  if (!isEmail(to)) return { ok: false, status: "INVALID", error: `"${input.to}" is not a valid email address.` };
  const def = getTemplateDef(input.template);
  if (!def) return { ok: false, status: "INVALID", error: `Unknown template "${input.template}".` };

  let files: CleanAttachment[] = [];
  if (input.attachments?.length) {
    if (!def.allowsAttachments) {
      return { ok: false, status: "INVALID", error: `The "${def.name}" email can't carry attachments. Use the "document" email for files.` };
    }
    try {
      files = prepareAttachments(input.attachments);
    } catch (err) {
      if (err instanceof AppError) return { ok: false, status: "INVALID", error: err.message, issues: [err.message] };
      throw err;
    }
  }
  const fileMeta = toMeta(files);

  // 1. Idempotency: same key → return the earlier result, don't send again
  if (input.idempotencyKey) {
    const existing = await db.emailLog.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing && existing.providerId && ["SENT", "DELIVERED", "TEST", "DELAYED", "QUEUED"].includes(existing.status)) {
      return { ok: true, id: existing.id, status: existing.provider === "test" ? "TEST" : "SENT", providerId: existing.providerId, duplicate: true };
    }
    if (existing) {
      // previous attempt failed: free the key so this attempt can use it
      await db.emailLog.update({ where: { id: existing.id }, data: { idempotencyKey: null } });
    }
  }

  const [settings, override, suppressed, contentOverride] = await Promise.all([
    getAllSettings(),
    db.templateSetting.findUnique({ where: { templateKey: def.key } }),
    db.suppression.findUnique({ where: { email: to } }),
    getContentOverride(def.key),
  ]);

  if (override && !override.enabled) {
    const error = `The "${def.name}" email is paused by an admin.`;
    const id = await logRejected(def.key, to, error, input);
    return { ok: false, id, status: "PAUSED", error };
  }

  // 2. Render (validates data and link allow-list)
  let rendered;
  try {
    rendered = await renderTemplate(def.key, input.data, settings, override, contentOverride, fileMeta);
  } catch (err) {
    if (err instanceof TemplateDataError) {
      const id = await logRejected(def.key, to, err.message, input);
      return { ok: false, id, status: "INVALID", error: err.message, issues: err.issues };
    }
    if (err instanceof AppError) return { ok: false, status: "INVALID", error: err.message };
    throw err;
  }

  const provider = getProvider();
  const fromEmail = settings["sending.fromEmail"];
  if (provider.name === "resend" && !fromEmail) {
    return { ok: false, status: "FAILED", error: 'Set a "From email" in Settings before sending live emails.' };
  }

  let log;
  try {
    log = await db.emailLog.create({
    data: {
      templateKey: def.key,
      to,
      subject: rendered.subject,
      status: "QUEUED",
      provider: provider.name,
      idempotencyKey: input.idempotencyKey ?? null,
      // file names and sizes only; file contents are never stored
      dataMasked: JSON.stringify({ ...maskData(rendered.data, def.linkFields), ...(fileMeta.length ? { attachments: fileMeta } : {}) }),
      // Full HTML only in test mode, so you can look at it. Live emails may contain working login links.
      html: provider.name === "test" ? rendered.html : null,
      source,
      apiKeyId: input.apiKeyId ?? null,
    },
  });
  } catch (err) {
    // Two requests with the same idempotency key at the same moment: the second one waits for the first
    if (input.idempotencyKey && typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002") {
      await sleep(1500);
      const first = await db.emailLog.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
      if (first?.providerId) {
        return { ok: true, id: first.id, status: first.provider === "test" ? "TEST" : "SENT", providerId: first.providerId, duplicate: true };
      }
      return { ok: false, id: first?.id, status: "FAILED", error: "Another request with the same idempotency key is still sending." };
    }
    throw err;
  }

  // 3. Blocked address: record and stop
  if (suppressed) {
    await db.emailLog.update({
      where: { id: log.id },
      data: { status: "SUPPRESSED", error: `Address is on the block list (${suppressed.reason.toLowerCase()}).`, html: null },
    });
    return { ok: false, id: log.id, status: "SUPPRESSED", error: `${to} is on the block list (${suppressed.reason.toLowerCase()}), so nothing was sent.` };
  }

  // 4. Send with retries
  const from = fromEmail ? `${settings["sending.fromName"]} <${fromEmail}>` : `${settings["sending.fromName"]} <test@localhost>`;
  let lastError = "";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await sleep(BACKOFF_MS[attempt - 1] ?? 2000);
    const result = await provider.send({
      from,
      to,
      replyTo: settings["sending.replyTo"] || undefined,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      idempotencyKey: input.idempotencyKey ?? log.id,
      tags: { template: def.key },
      attachments: files.length ? files : undefined,
    });
    if (result.ok) {
      const status = provider.name === "test" ? "TEST" : "SENT";
      await db.emailLog.update({
        where: { id: log.id },
        data: { status, providerId: result.providerId, attempts: attempt, sentAt: new Date(), error: null },
      });
      void cleanupOldLogs(settings["logs.retentionDays"]);
      return { ok: true, id: log.id, status, providerId: result.providerId };
    }
    lastError = result.error;
    await db.emailLog.update({ where: { id: log.id }, data: { attempts: attempt, error: lastError } });
    if (!result.retryable) break;
  }

  await db.emailLog.update({ where: { id: log.id }, data: { status: "FAILED", error: lastError } });
  logger.warn("Email failed", { logId: log.id, template: def.key, error: lastError });
  return { ok: false, id: log.id, status: "FAILED", error: lastError };
}
