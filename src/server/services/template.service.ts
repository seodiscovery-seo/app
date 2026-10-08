import "server-only";
import { z } from "zod";
import { CONTENT_LIMITS, type EmailContent } from "@/emails/registry";
import { db } from "@/lib/db";

export function getTemplateOverride(key: string) {
  return db.templateSetting.findUnique({ where: { templateKey: key } });
}

export async function listTemplateOverrides() {
  const rows = await db.templateSetting.findMany();
  return new Map(rows.map((r) => [r.templateKey, r]));
}

export function saveTemplateOverride(key: string, input: { subject?: string; preheader?: string; enabled: boolean }, userId: string) {
  const data = { subject: input.subject || null, preheader: input.preheader || null, enabled: input.enabled, updatedById: userId };
  return db.templateSetting.upsert({ where: { templateKey: key }, update: data, create: { templateKey: key, ...data } });
}

// ─── Email wording (stored in the settings table: no database change needed) ───

export type ContentOverride = Partial<EmailContent> & { updatedBy?: string; updatedAt?: string };

const contentKey = (templateKey: string) => `template-content:${templateKey}`;

export const contentOverrideSchema = z.object({
  heading: z.string().trim().max(CONTENT_LIMITS.heading, `Heading: max ${CONTENT_LIMITS.heading} characters`).optional(),
  body: z.string().trim().max(CONTENT_LIMITS.body, `Main text: max ${CONTENT_LIMITS.body} characters`).optional(),
  button: z.string().trim().max(CONTENT_LIMITS.button, `Button text: max ${CONTENT_LIMITS.button} characters`).optional(),
  note: z.string().trim().max(CONTENT_LIMITS.note, `Note: max ${CONTENT_LIMITS.note} characters`).optional(),
});

export async function getContentOverride(templateKey: string): Promise<ContentOverride | null> {
  const row = await db.setting.findUnique({ where: { key: contentKey(templateKey) } });
  if (!row) return null;
  try {
    return JSON.parse(row.value) as ContentOverride;
  } catch {
    return null;
  }
}

/** Empty fields mean "use the default wording". */
export async function saveContentOverride(templateKey: string, content: Partial<EmailContent>, userName: string) {
  const clean = Object.fromEntries(Object.entries(content).filter(([, v]) => typeof v === "string" && v.trim() !== ""));
  if (Object.keys(clean).length === 0) {
    await db.setting.deleteMany({ where: { key: contentKey(templateKey) } });
    return null;
  }
  const value = JSON.stringify({ ...clean, updatedBy: userName, updatedAt: new Date().toISOString() });
  await db.setting.upsert({ where: { key: contentKey(templateKey) }, update: { value }, create: { key: contentKey(templateKey), value } });
  return clean;
}
