"use client";

import { useState } from "react";
import type { SettingsMap } from "@/config/settings";
import type { FormState } from "@/lib/form";
import { Button, Field, FormMessage, useKeepForm } from "@/components/form-controls";
import { saveSettingsAction } from "@/server/actions/admin.actions";

export function SettingsForm({ settings }: { settings: SettingsMap }) {
  const { state, onSubmit, pending } = useKeepForm<FormState>(saveSettingsAction, undefined);
  const [color, setColor] = useState(settings["brand.primaryColor"]);
  const fe = state?.fieldErrors;

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-6">
      <FormMessage state={state} />

      <section className="card p-5 sm:p-6">
        <h2 className="section-title">Brand</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Brand name" name="brand.name" error={fe?.["brand.name"]}>
            <input id="brand.name" name="brand.name" className="input" defaultValue={settings["brand.name"]} required />
          </Field>
          <Field label="Button colour" name="brand.primaryColor" error={fe?.["brand.primaryColor"]} hint="Dark enough for white text on top">
            <div className="flex gap-2">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-[38px] w-12 cursor-pointer rounded-lg border border-line bg-white p-1" aria-label="Pick colour" />
              <input id="brand.primaryColor" name="brand.primaryColor" className="input font-mono" value={color} onChange={(e) => setColor(e.target.value)} />
            </div>
          </Field>
          <Field label="Logo link" name="brand.logoUrl" error={fe?.["brand.logoUrl"]} hint="A PNG or JPG on your website, about 200×72 px. Empty = brand name as text.">
            <input id="brand.logoUrl" name="brand.logoUrl" type="url" className="input" defaultValue={settings["brand.logoUrl"]} placeholder="https://yourdomain.com/logo.png" />
          </Field>
          <Field label="Website / app address" name="brand.appUrl" error={fe?.["brand.appUrl"]} hint="The logo links here.">
            <input id="brand.appUrl" name="brand.appUrl" type="url" className="input" defaultValue={settings["brand.appUrl"]} placeholder="https://yourdomain.com" />
          </Field>
          <Field label="Support email" name="brand.supportEmail" error={fe?.["brand.supportEmail"]} hint="Shown in the footer.">
            <input id="brand.supportEmail" name="brand.supportEmail" type="email" className="input" defaultValue={settings["brand.supportEmail"]} />
          </Field>
          <Field label="Company address" name="brand.address" error={fe?.["brand.address"]} hint="One line, shown in the footer.">
            <input id="brand.address" name="brand.address" className="input" defaultValue={settings["brand.address"]} />
          </Field>
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="section-title">Sending</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="From name" name="sending.fromName" error={fe?.["sending.fromName"]}>
            <input id="sending.fromName" name="sending.fromName" className="input" defaultValue={settings["sending.fromName"]} required />
          </Field>
          <Field label="From email" name="sending.fromEmail" error={fe?.["sending.fromEmail"]} hint="Must use the domain you verified in Resend.">
            <input id="sending.fromEmail" name="sending.fromEmail" type="email" className="input" defaultValue={settings["sending.fromEmail"]} placeholder="no-reply@mail.yourdomain.com" />
          </Field>
          <Field label="Reply-to email" name="sending.replyTo" error={fe?.["sending.replyTo"]} hint="Where replies go. Empty = no reply address.">
            <input id="sending.replyTo" name="sending.replyTo" type="email" className="input" defaultValue={settings["sending.replyTo"]} />
          </Field>
          <Field label="Keep logs for (days)" name="logs.retentionDays" error={fe?.["logs.retentionDays"]} hint="Older logs are deleted automatically.">
            <input id="logs.retentionDays" name="logs.retentionDays" type="number" min={7} max={3650} className="input" defaultValue={settings["logs.retentionDays"]} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Allowed link domains" name="sending.allowedLinkHosts" error={fe?.["sending.allowedLinkHosts"]} hint="Links in emails must point to these domains (and their sub-domains). Stops a bug or attacker from putting a strange link in a reset email. Empty = any https link.">
              <input id="sending.allowedLinkHosts" name="sending.allowedLinkHosts" className="input" defaultValue={settings["sending.allowedLinkHosts"].join(", ")} placeholder="yourdomain.com, app.yourdomain.com" />
            </Field>
          </div>
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="section-title">Quotations</h2>
        <p className="mt-0.5 text-xs text-muted">Defaults for every new quotation. You can still change them per quotation.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="Number prefix" name="quotes.prefix" error={fe?.["quotes.prefix"]} hint="QT gives QT-2026-001">
            <input id="quotes.prefix" name="quotes.prefix" className="input uppercase" maxLength={6} defaultValue={settings["quotes.prefix"]} />
          </Field>
          <Field label="Currency" name="quotes.currency" error={fe?.["quotes.currency"]} hint="INR, USD, AED…">
            <input id="quotes.currency" name="quotes.currency" className="input uppercase" maxLength={3} defaultValue={settings["quotes.currency"]} />
          </Field>
          <Field label="Valid for (days)" name="quotes.validDays" error={fe?.["quotes.validDays"]}>
            <input id="quotes.validDays" name="quotes.validDays" type="number" min={1} max={365} className="input" defaultValue={settings["quotes.validDays"]} />
          </Field>
          <Field label="Tax name" name="quotes.taxLabel" error={fe?.["quotes.taxLabel"]}>
            <input id="quotes.taxLabel" name="quotes.taxLabel" className="input" defaultValue={settings["quotes.taxLabel"]} />
          </Field>
          <Field label="Tax %" name="quotes.taxPercent" error={fe?.["quotes.taxPercent"]}>
            <input id="quotes.taxPercent" name="quotes.taxPercent" type="number" min={0} max={100} step="any" className="input" defaultValue={settings["quotes.taxPercent"]} />
          </Field>
          <Field label="Your tax number (GSTIN)" name="quotes.taxId" error={fe?.["quotes.taxId"]} hint="Printed on the PDF. Optional.">
            <input id="quotes.taxId" name="quotes.taxId" className="input uppercase" defaultValue={settings["quotes.taxId"]} />
          </Field>
          <div className="sm:col-span-3">
            <Field label="Default terms" name="quotes.terms" error={fe?.["quotes.terms"]} hint="One per line.">
              <textarea id="quotes.terms" name="quotes.terms" rows={4} className="input" defaultValue={settings["quotes.terms"]} />
            </Field>
          </div>
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="section-title">Sign-in &amp; accounts</h2>
        <div className="mt-4 space-y-4">
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="auth.allowSignup" defaultChecked={settings["auth.allowSignup"]} className="mt-0.5 h-4 w-4" />
            <span>
              <span className="font-semibold">Let people create their own account</span>
              <span className="block text-muted">Adds &ldquo;Create an account&rdquo; to the sign-in page. New accounts confirm their email first and start as Viewers.</span>
            </span>
          </label>
          <Field label="Only allow this email domain" name="auth.signupDomain" error={fe?.["auth.signupDomain"]} hint="e.g. seodiscovery.com, so only your team can sign up. Empty = anyone.">
            <input id="auth.signupDomain" name="auth.signupDomain" className="input" defaultValue={settings["auth.signupDomain"]} placeholder="seodiscovery.com" />
          </Field>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="auth.loginAlerts" defaultChecked={settings["auth.loginAlerts"]} className="mt-0.5 h-4 w-4" />
            <span>
              <span className="font-semibold">Email people when they sign in from a new device</span>
              <span className="block text-muted">Uses the &ldquo;New login alert&rdquo; email.</span>
            </span>
          </label>
        </div>
      </section>

      <Button pending={pending}>Save settings</Button>
    </form>
  );
}
