import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FIELD_LABELS } from "@/emails/field-labels";
import { CONTENT_LIMITS, getTemplateDef } from "@/emails/registry";
import { requireUserPage } from "@/lib/auth/dal";
import { formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { getContentOverride, getTemplateOverride } from "@/server/services/template.service";
import { PreviewStudio } from "./preview-studio";
import { TemplateSettingsForm } from "./template-settings-form";

export const metadata: Metadata = { title: "Email" };

export default async function TemplatePage({ params }: { params: Promise<{ key: string }> }) {
  const user = await requireUserPage();
  const { key } = await params;
  const def = getTemplateDef(key);
  if (!def) notFound();
  const [override, content] = await Promise.all([getTemplateOverride(key), getContentOverride(key)]);
  const isAdmin = user.role === "ADMIN";
  const fields = Object.entries(def.schema.shape).map(([name, schema]) => ({ name, optional: (schema as { isOptional: () => boolean }).isOptional() }));
  const sampleJson = JSON.stringify(def.sample, null, 2);

  const defaults = { subject: def.subject, preheader: def.preheader, ...def.content };
  const values = {
    subject: override?.subject || def.subject,
    preheader: override?.preheader || def.preheader,
    heading: content?.heading || def.content.heading,
    body: content?.body || def.content.body,
    button: content?.button || def.content.button,
    note: content?.note || def.content.note,
  };

  return (
    <>
      <Link href="/templates" className="text-sm font-medium text-muted hover:text-ink">← All emails</Link>
      <div className="mt-2">
        <PageHeader title={def.name} description={`When is it sent? ${def.description}`} />
      </div>
      <ol className="mb-6 grid gap-2 text-sm sm:grid-cols-3" aria-label="How to use this page">
        {[
          ["1", "Change the words", "Edit the boxes on the right. The preview updates as you type."],
          ["2", "Check it", "Switch between Desktop and Mobile, then send yourself a test."],
          ["3", "Save", "New emails use your words. Customer details fill in automatically."],
        ].map(([n, t, d]) => (
          <li key={n} className="flex gap-3 rounded-xl border border-line bg-white px-4 py-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand">{n}</span>
            <span><span className="font-semibold">{t}</span><span className="block text-xs text-muted">{d}</span></span>
          </li>
        ))}
      </ol>

      <PreviewStudio
        templateKey={def.key}
        sampleJson={sampleJson}
        canSend={isAdmin}
        defaultTo={user.email}
        fields={fields.map((f) => ({ name: f.name, optional: f.optional, label: FIELD_LABELS[f.name]?.label ?? f.name, kind: FIELD_LABELS[f.name]?.kind }))}
        editor={
          <TemplateSettingsForm
            templateKey={def.key}
            defaults={defaults}
            values={values}
            enabled={override?.enabled ?? true}
            readOnly={!isAdmin}
            variables={fields.map((f) => f.name).filter((n) => !/url$/i.test(n))}
            limits={CONTENT_LIMITS}
            lastEdited={content?.updatedAt ? `Wording last changed by ${content.updatedBy ?? "an admin"}, ${formatDateTime(content.updatedAt)}` : undefined}
          />
        }
      />

      <details className="card mt-6 p-6">
        <summary className="cursor-pointer section-title">For your developer: how the website sends this email</summary>
        <p className="mt-1 text-sm text-muted">Your website calls this address with an API key. Fields marked optional can be left out.</p>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {fields.map((f) => (
            <li key={f.name} className="chip bg-paper text-ink">
              <code className="font-mono">{f.name}</code>
              {f.optional && <span className="font-normal text-muted">optional</span>}
            </li>
          ))}
        </ul>
        <pre className="mt-4 overflow-x-auto rounded-xl bg-navy p-4 font-mono text-xs leading-relaxed text-slate-100">
{`await fetch("YOUR-EMAIL-APP-URL/api/v1/send", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ek_your_api_key",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    template: "${def.key}",
    to: "user@example.com",
    data: ${JSON.stringify(def.sample, null, 2).replace(/\n/g, "\n    ")}
  })
});`}
        </pre>
        <p className="mt-2 text-xs text-muted">
          Full guide: <Link href="/api-keys" className="text-brand underline">API &amp; setup</Link>
        </p>
      </details>
    </>
  );
}
