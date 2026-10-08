/**
 * Resend → this app: delivery, bounce and spam-complaint events.
 * In Resend: Webhooks → Add endpoint → https://YOUR-DOMAIN/api/webhooks/resend
 * Copy the signing secret (whsec_…) into RESEND_WEBHOOK_SECRET in .env.
 */
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { handleResendEvent, verifySignature } from "@/server/email/webhook";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!env.RESEND_WEBHOOK_SECRET) {
    return Response.json({ ok: false, error: "RESEND_WEBHOOK_SECRET is not set on the server." }, { status: 503 });
  }
  const body = await req.text();
  const valid = verifySignature(
    env.RESEND_WEBHOOK_SECRET,
    { id: req.headers.get("svix-id"), timestamp: req.headers.get("svix-timestamp"), signature: req.headers.get("svix-signature") },
    body,
  );
  if (!valid) return Response.json({ ok: false, error: "Invalid signature." }, { status: 401 });

  try {
    const event = JSON.parse(body) as Parameters<typeof handleResendEvent>[0];
    const result = await handleResendEvent(event);
    return Response.json({ ok: true, ...result });
  } catch (err) {
    logger.error("Webhook handling failed", { error: err });
    // 500 makes Resend retry later
    return Response.json({ ok: false }, { status: 500 });
  }
}
