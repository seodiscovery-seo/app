/**
 * Email providers behind one small interface. To use SMTP or Amazon SES later,
 * add another provider here; nothing else in the app needs to change.
 */
import "server-only";
import { env, isLiveMode } from "@/lib/env";

export type OutgoingEmail = {
  from: string;
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey?: string;
  tags?: Record<string, string>;
  attachments?: Array<{ filename: string; contentBase64: string; contentType: string }>;
};

export type ProviderResult =
  | { ok: true; providerId: string }
  | { ok: false; error: string; retryable: boolean };

export type EmailProvider = { name: "resend" | "test"; send: (email: OutgoingEmail) => Promise<ProviderResult> };

/** Test mode: nothing leaves the server. The email is saved so you can open it in the admin panel. */
const testProvider: EmailProvider = {
  name: "test",
  async send() {
    return { ok: true, providerId: `test_${crypto.randomUUID()}` };
  },
};

const resendProvider: EmailProvider = {
  name: "resend",
  async send(email) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), email.attachments?.length ? 60_000 : 10_000);
    try {
      const res = await fetch(`${env.RESEND_API_URL}/emails`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
          ...(email.idempotencyKey ? { "Idempotency-Key": email.idempotencyKey.slice(0, 256) } : {}),
        },
        body: JSON.stringify({
          from: email.from,
          to: [email.to],
          subject: email.subject,
          html: email.html,
          text: email.text,
          ...(email.replyTo ? { reply_to: email.replyTo } : {}),
          ...(email.tags ? { tags: Object.entries(email.tags).map(([name, value]) => ({ name, value })) } : {}),
          ...(email.attachments?.length
            ? { attachments: email.attachments.map((a) => ({ filename: a.filename, content: a.contentBase64, content_type: a.contentType })) }
            : {}),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
      if (res.ok && body.id) return { ok: true, providerId: body.id };
      const retryable = res.status === 429 || res.status >= 500;
      return { ok: false, retryable, error: `Resend ${res.status}: ${body.message ?? body.name ?? "unknown error"}` };
    } catch (err) {
      const aborted = err instanceof Error && err.name === "AbortError";
      return { ok: false, retryable: true, error: aborted ? "Resend did not answer within 10 seconds" : `Network error: ${err instanceof Error ? err.message : "unknown"}` };
    } finally {
      clearTimeout(timer);
    }
  },
};

export function getProvider(): EmailProvider {
  return isLiveMode() ? resendProvider : testProvider;
}
