/** Renders a template with the given data for the admin preview iframe. */
import { getCurrentUser } from "@/lib/auth/dal";
import { getTemplateDef } from "@/emails/registry";
import { renderTemplate, TemplateDataError, type TemplateOverride } from "@/server/email/render";
import { getAllSettings } from "@/server/services/settings.service";
import { contentOverrideSchema, getContentOverride, getTemplateOverride } from "@/server/services/template.service";

export const dynamic = "force-dynamic";

const page = (msg: string) =>
  `<!doctype html><html><body style="font-family:system-ui,sans-serif;padding:32px;color:#b42318"><h3 style="margin:0 0 8px">Preview can't be shown</h3><p style="margin:0;white-space:pre-line">${msg
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")}</p></body></html>`;

export async function GET(req: Request) {
  if (!(await getCurrentUser())) return new Response("Please sign in.", { status: 401 });
  const url = new URL(req.url);
  const key = url.searchParams.get("template") ?? "";
  const def = getTemplateDef(key);
  if (!def) return new Response(page("Unknown template."), { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } });

  let data: unknown = def.sample;
  const raw = url.searchParams.get("data");
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      return new Response(page("The sample data is not valid JSON."), { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } });
    }
  }
  try {
    const [settings, savedOverride, savedContent] = await Promise.all([getAllSettings(), getTemplateOverride(key), getContentOverride(key)]);
    // Unsaved edits from the editor (admin is typing): preview them without saving
    let override: TemplateOverride = savedOverride;
    let content = savedContent;
    const draftRaw = url.searchParams.get("draft");
    if (draftRaw) {
      try {
        const draft = JSON.parse(draftRaw) as { subject?: string; preheader?: string; content?: unknown };
        override = { subject: draft.subject ?? null, preheader: draft.preheader ?? null, enabled: savedOverride?.enabled ?? true };
        const parsed = contentOverrideSchema.safeParse(draft.content ?? {});
        if (parsed.success) content = parsed.data;
      } catch {
        // ignore a broken draft and show the saved version
      }
    }
    let files: { filename: string; size: number; type: string }[] | undefined;
    try {
      const raw = url.searchParams.get("files");
      if (raw) files = (JSON.parse(raw) as typeof files)?.slice(0, 5).map((f) => ({ filename: String(f.filename).slice(0, 120), size: Number(f.size) || 0, type: String(f.type).slice(0, 20) }));
    } catch {
      files = undefined;
    }
    if (!files && key === "document") files = [{ filename: "Quotation-SEO.pdf", size: 245_000, type: "PDF" }];
    const out = await renderTemplate(key, data, settings, override, content, files);
    const body = url.searchParams.get("format") === "text" ? `<pre style="font:14px/1.6 ui-monospace,monospace;white-space:pre-wrap;padding:24px;margin:0">${out.text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</pre>` : out.html;
    return new Response(body, {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Email-Subject": encodeURIComponent(out.subject) },
    });
  } catch (err) {
    const msg = err instanceof TemplateDataError ? err.issues.join("\n") : err instanceof Error ? err.message : "Unknown error";
    return new Response(page(msg), { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
}
