import type { Metadata } from "next";
import Link from "next/link";
import { ALL_TEMPLATES, fillText } from "@/emails/registry";
import { requireUserPage } from "@/lib/auth/dal";
import { cn, formatDateTime, formatNumber } from "@/lib/utils";
import { EmailThumb } from "@/components/email-thumb";
import { PageHeader } from "@/components/page-header";
import { lastSentByTemplate } from "@/server/services/log.service";
import { getSetting } from "@/server/services/settings.service";
import { listTemplateOverrides } from "@/server/services/template.service";

export const metadata: Metadata = { title: "Emails" };

export default async function TemplatesPage() {
  await requireUserPage();
  const [overrides, usage, brand] = await Promise.all([listTemplateOverrides(), lastSentByTemplate(), getSetting("brand.name")]);
  const groups = [
    { key: "Account", text: "When someone joins" },
    { key: "Security", text: "Keeping accounts safe" },
    { key: "Documents", text: "Quotations, invoices and reports with files" },
  ] as const;

  return (
    <>
      <PageHeader title="Emails" description="The emails your website sends by itself. Click one to change its words and see how it looks." />
      <section className="card mb-8 grid gap-4 p-5 sm:grid-cols-3">
        {[
          ["Your website does the sending", "When someone signs up or forgets a password, your website asks this app to send the right email. You don't send these by hand."],
          ["You control the words", "Open an email to change its subject, heading, text and button. Customer details like the name fill in automatically."],
          ["Want to send something yourself?", "Use Quotations or Send a document in the menu to email a client directly."],
        ].map(([t, d]) => (
          <div key={t}>
            <p className="text-sm font-bold">{t}</p>
            <p className="mt-1 text-sm text-muted">{d}</p>
          </div>
        ))}
      </section>
      {groups.map((g) => (
        <section key={g.key} className="mb-10">
          <div className="mb-4 flex items-baseline gap-3">
            <h2 className="section-title">{g.key}</h2>
            <p className="text-sm text-muted">{g.text}</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {ALL_TEMPLATES.filter((t) => t.category === g.key).map((t) => {
              const o = overrides.get(t.key);
              const u = usage.get(t.key);
              const paused = o && !o.enabled;
              const subject = fillText(o?.subject || t.subject, t.sample as Record<string, unknown>, brand);
              return (
                <Link key={t.key} href={`/templates/${t.key}`} className="card group flex flex-col overflow-hidden transition-[border-color,box-shadow] hover:border-brand/40 hover:shadow-[0_8px_24px_-12px_rgba(16,26,51,0.25)]">
                  <EmailThumb templateKey={t.key} title={t.name} />
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-bold group-hover:text-brand">{t.name}</h3>
                      <span className={cn("chip", paused ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700")}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", paused ? "bg-amber-500" : "bg-emerald-500")} />
                        {paused ? "Paused" : "Active"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted">{t.description}</p>
                    <p className="mt-4 truncate text-sm">
                      <span className="text-muted">Subject: </span>
                      <span className="font-medium">{subject}</span>
                    </p>
                    <p className="mt-auto pt-4 text-xs text-muted">{u ? `${formatNumber(u.count)} sent · last ${formatDateTime(u.last)}` : "Not sent yet"}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
