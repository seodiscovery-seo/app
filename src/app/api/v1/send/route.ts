/**
 * POST /api/v1/send
 * Headers: Authorization: Bearer ek_…   (create a key under "API keys")
 *          Idempotency-Key: optional, same key = sent once
 * Body:    { "template": "password-reset", "to": "user@example.com", "data": { … } }
 *          files (only with "document"): "attachments": [{ "filename": "quote.pdf", "content": "<base64>" }]
 */
import { z } from "zod";
import { API_RATE_LIMIT } from "@/config/constants";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { sendEmail } from "@/server/email/send";
import { verifyApiKey } from "@/server/services/apikey.service";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  template: z.string().min(1).max(60),
  to: z.string().min(3).max(254),
  data: z.record(z.unknown()).default({}),
  idempotencyKey: z.string().min(1).max(200).optional(),
  /** files as base64, e.g. a quotation PDF: [{ "filename": "quote.pdf", "content": "JVBERi0..." }] */
  attachments: z.array(z.object({ filename: z.string().min(1).max(200), content: z.string().min(1), contentType: z.string().max(120).optional() })).max(5).optional(),
});

const json = (body: unknown, status: number) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const key = await verifyApiKey(token);
  if (!key) return json({ ok: false, error: "Missing or invalid API key. Send it as: Authorization: Bearer ek_…" }, 401);

  const limit = checkRateLimit(`api:${key.id}`, API_RATE_LIMIT.max, API_RATE_LIMIT.windowMs);
  if (!limit.ok) return json({ ok: false, error: "Too many requests. Slow down and try again shortly." }, 429);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ ok: false, error: "Body must be JSON." }, 400);
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return json({ ok: false, error: "Invalid request.", issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }, 400);
  }

  const result = await sendEmail({
    ...parsed.data,
    idempotencyKey: parsed.data.idempotencyKey ?? req.headers.get("idempotency-key") ?? undefined,
    source: "api",
    apiKeyId: key.id,
  });

  if (result.ok) return json(result, 200);
  const status = { INVALID: 400, PAUSED: 409, SUPPRESSED: 422, FAILED: 502 }[result.status];
  return json(result, status);
}
