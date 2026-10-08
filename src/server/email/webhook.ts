/**
 * Resend webhooks (delivered, bounced, complained…).
 * Resend signs webhooks with Svix: HMAC-SHA256 over "id.timestamp.body" using the secret after "whsec_".
 * Verified here without extra packages.
 */
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { suppress } from "@/server/services/suppression.service";

const TOLERANCE_SECONDS = 5 * 60;

export function verifySignature(
  secret: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  body: string,
  now = Date.now(),
): boolean {
  if (!headers.id || !headers.timestamp || !headers.signature) return false;
  const ts = Number(headers.timestamp);
  if (!Number.isFinite(ts) || Math.abs(now / 1000 - ts) > TOLERANCE_SECONDS) return false;

  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${headers.id}.${headers.timestamp}.${body}`).digest();
  // header looks like "v1,abc= v1,def=" (several signatures during key rotation)
  return headers.signature.split(" ").some((part) => {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) return false;
    const given = Buffer.from(sig, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

type ResendEvent = {
  type: string;
  created_at?: string;
  data?: {
    email_id?: string;
    to?: string[] | string;
    bounce?: { type?: string; subType?: string; message?: string };
  };
};

const STATUS_BY_EVENT: Record<string, string | undefined> = {
  "email.sent": "SENT",
  "email.delivered": "DELIVERED",
  "email.delivery_delayed": "DELAYED",
  "email.bounced": "BOUNCED",
  "email.complained": "COMPLAINED",
  "email.failed": "FAILED",
};

/** Final statuses that a later "sent"/"delayed" event must not overwrite. */
const FINAL = ["DELIVERED", "BOUNCED", "COMPLAINED", "FAILED"];

export async function handleResendEvent(event: ResendEvent) {
  const providerId = event.data?.email_id;
  const recipients = Array.isArray(event.data?.to) ? event.data?.to : event.data?.to ? [event.data.to] : [];
  const log = providerId ? await db.emailLog.findUnique({ where: { providerId } }) : null;

  const bounce = event.data?.bounce;
  const detail =
    event.type === "email.bounced"
      ? [bounce?.type, bounce?.subType, bounce?.message].filter(Boolean).join(" · ") || "Bounced"
      : event.type === "email.complained"
        ? "Recipient marked the email as spam"
        : null;

  await db.emailEvent.create({ data: { logId: log?.id ?? null, type: event.type, detail } });

  const status = STATUS_BY_EVENT[event.type];
  if (log && status) {
    const keep = FINAL.includes(log.status) && !["BOUNCED", "COMPLAINED"].includes(status);
    if (!keep) {
      await db.emailLog.update({
        where: { id: log.id },
        data: {
          status,
          ...(status === "DELIVERED" ? { deliveredAt: new Date(event.created_at ?? Date.now()) } : {}),
          ...(detail ? { error: detail } : {}),
        },
      });
    }
  }

  // Block list: hard bounces and spam complaints. Temporary bounces are not blocked.
  const temporary = /transient|temporary|soft/i.test(`${bounce?.type ?? ""} ${bounce?.subType ?? ""}`);
  if ((event.type === "email.bounced" && !temporary) || event.type === "email.complained") {
    const addresses = recipients.length ? recipients : log ? [log.to] : [];
    for (const address of addresses) {
      await suppress(address, event.type === "email.complained" ? "COMPLAINT" : "BOUNCE", detail ?? undefined);
    }
    logger.info("Address blocked from webhook", { type: event.type, count: addresses.length });
  }
  return { matched: !!log };
}
