/**
 * Validates template data and turns a template into HTML + plain text.
 * No sending happens here, so previews use the exact same code as real emails.
 */
import "server-only";
import { render } from "@react-email/components";
import { ZodError } from "zod";
import type { SettingsMap } from "@/config/settings";
import type { Brand, FileMeta } from "@/emails/components";
import { fillContent, fillText, getTemplateDef, type EmailContent, type TemplateDef } from "@/emails/registry";
import { AppError } from "@/lib/errors";

export type TemplateOverride = { subject: string | null; preheader: string | null; enabled: boolean } | null;

export type RenderedEmail = {
  def: TemplateDef;
  subject: string;
  preheader: string;
  html: string;
  text: string;
  data: Record<string, unknown>;
};

export function brandFromSettings(s: SettingsMap): Brand {
  return {
    name: s["brand.name"],
    logoUrl: s["brand.logoUrl"],
    primaryColor: s["brand.primaryColor"],
    appUrl: s["brand.appUrl"],
    supportEmail: s["brand.supportEmail"],
    address: s["brand.address"],
  };
}

export class TemplateDataError extends AppError {
  readonly issues: string[];
  constructor(issues: string[]) {
    super("VALIDATION", `Template data is invalid: ${issues.join("; ")}`);
    this.issues = issues;
  }
}

/** Links must point to an allowed host (when the allow-list is set). */
export function checkLinkHosts(def: TemplateDef, data: Record<string, unknown>, allowedHosts: string[]): string[] {
  if (allowedHosts.length === 0) return [];
  const problems: string[] = [];
  for (const field of def.linkFields) {
    const v = data[field];
    if (typeof v !== "string") continue;
    let host = "";
    try {
      host = new URL(v).hostname.toLowerCase();
    } catch {
      continue;
    }
    const ok = allowedHosts.some((h) => host === h || host.endsWith(`.${h}`)) || host === "localhost" || host === "127.0.0.1";
    if (!ok) problems.push(`${field}: links to "${host}" are not allowed (allowed: ${allowedHosts.join(", ")})`);
  }
  return problems;
}

export async function renderTemplate(
  key: string,
  rawData: unknown,
  settings: SettingsMap,
  override: TemplateOverride,
  contentOverride?: Partial<EmailContent> | null,
  files?: FileMeta[],
): Promise<RenderedEmail> {
  const def = getTemplateDef(key);
  if (!def) throw new AppError("NOT_FOUND", `Unknown template "${key}".`);

  let data: Record<string, unknown>;
  try {
    data = def.schema.parse(rawData ?? {}) as Record<string, unknown>;
  } catch (err) {
    if (err instanceof ZodError) {
      throw new TemplateDataError(err.issues.map((i) => `${i.path.join(".") || "data"}: ${i.message}`));
    }
    throw err;
  }
  const hostProblems = checkLinkHosts(def, data, settings["sending.allowedLinkHosts"]);
  if (hostProblems.length) throw new TemplateDataError(hostProblems);

  const brand = brandFromSettings(settings);
  const subject = fillText(override?.subject || def.subject, data, brand.name);
  const preheader = fillText(override?.preheader || def.preheader, data, brand.name);
  // Admin wording wins over the default; empty fields fall back to the default
  const pick = (k: keyof EmailContent) => (contentOverride?.[k]?.trim() ? contentOverride[k]! : def.content[k]);
  const content: EmailContent = {
    heading: fillContent(pick("heading"), data, brand.name),
    body: fillContent(pick("body"), data, brand.name),
    button: fillContent(pick("button"), data, brand.name) || fillContent(def.content.button, data, brand.name),
    note: fillContent(pick("note"), data, brand.name),
  };
  const element = def.render({ data: data as never, brand, preheader, content, files });
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  return { def, subject, preheader, html, text, data };
}
