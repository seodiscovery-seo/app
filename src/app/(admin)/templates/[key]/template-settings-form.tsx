"use client";

import { useEffect, useState } from "react";
import type { FormState } from "@/lib/form";
import { cn } from "@/lib/utils";
import { Button, FormMessage, useKeepForm } from "@/components/form-controls";
import { saveTemplateAction } from "@/server/actions/admin.actions";
import { fieldLabel } from "@/emails/field-labels";

type Content = { heading: string; body: string; button: string; note: string };
type Values = { subject: string; preheader: string } & Content;

export const DRAFT_EVENT = "email-draft";

/** Edits the words of one email. Every keystroke is previewed live (not saved until "Save"). */
export function TemplateSettingsForm({ templateKey, defaults, values, enabled, readOnly, variables, lastEdited, limits }: {
  templateKey: string;
  defaults: Values;
  values: Values;
  enabled: boolean;
  readOnly: boolean;
  variables: string[];
  lastEdited?: string;
  limits: { heading: number; body: number; button: number; note: number };
}) {
  const { state, onSubmit, pending } = useKeepForm<FormState>(saveTemplateAction, undefined);
  const [v, setV] = useState<Values>(values);
  const [focused, setFocused] = useState<keyof Values>("body");

  // Tell the preview about unsaved changes
  useEffect(() => {
    const t = setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent(DRAFT_EVENT, {
          detail: {
            subject: v.subject === defaults.subject ? "" : v.subject,
            preheader: v.preheader === defaults.preheader ? "" : v.preheader,
            content: { heading: v.heading, body: v.body, button: v.button, note: v.note },
          },
        }),
      );
    }, 250);
    return () => clearTimeout(t);
  }, [v, defaults]);

  const dirty = (Object.keys(v) as Array<keyof Values>).some((k) => v[k] !== values[k]);
  const custom = (Object.keys(v) as Array<keyof Values>).some((k) => v[k] !== defaults[k]);
  const set = (k: keyof Values) => (e: { target: { value: string } }) => setV((p) => ({ ...p, [k]: e.target.value }));

  function insertVariable(name: string) {
    const token = `{{${name}}}`;
    const el = document.getElementById(`tc-${focused}`) as HTMLInputElement | HTMLTextAreaElement | null;
    const current = v[focused];
    const start = el?.selectionStart ?? current.length;
    const end = el?.selectionEnd ?? current.length;
    setV((p) => ({ ...p, [focused]: current.slice(0, start) + token + current.slice(end) }));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  }

  const field = (k: keyof Values, label: string, opts: { area?: boolean; rows?: number; max?: number; hint?: string } = {}) => (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={`tc-${k}`} className="text-sm font-semibold">{label}</label>
        {opts.max && <span className={cn("text-xs tabular-nums", v[k].length > opts.max ? "font-semibold text-danger" : "text-muted")}>{v[k].length}/{opts.max}</span>}
      </div>
      {opts.area ? (
        <textarea id={`tc-${k}`} name={k} rows={opts.rows ?? 4} value={v[k]} onChange={set(k)} onFocus={() => setFocused(k)} className="input leading-relaxed" />
      ) : (
        <input id={`tc-${k}`} name={k} value={v[k]} onChange={set(k)} onFocus={() => setFocused(k)} className="input" />
      )}
      {state?.fieldErrors?.[k]?.[0] ? (
        <p role="alert" className="mt-1 text-xs font-medium text-danger">{state.fieldErrors[k]![0]}</p>
      ) : (
        opts.hint && <p className="mt-1 text-xs text-muted">{opts.hint}</p>
      )}
    </div>
  );

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="key" value={templateKey} />
      <fieldset disabled={readOnly} className="space-y-4">
        {field("subject", "Subject")}
        {field("heading", "Heading", { max: limits.heading })}
        {field("body", "Main text", { area: true, rows: 5, max: limits.body, hint: "Leave a blank line to start a new paragraph." })}
        {field("button", "Button text", { max: limits.button })}
        {field("note", "Small note", { area: true, rows: 3, max: limits.note })}
        {field("preheader", "Inbox preview line", { hint: "Grey text shown after the subject in the inbox." })}

        <div>
          <p className="text-xs font-semibold text-muted">
            Add details that change per email, into &ldquo;{focused === "body" ? "Main text" : focused === "note" ? "Small note" : focused === "preheader" ? "Inbox preview line" : focused.charAt(0).toUpperCase() + focused.slice(1)}&rdquo;:
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {["brand", ...variables].map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => insertVariable(name)}
                title={`Inserts {{${name}}}`}
                className="rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-semibold text-ink hover:border-brand hover:text-brand"
              >
                + {name === "brand" ? "Your company name" : fieldLabel(name)}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-muted">They appear as <code className="code">{"{{name}}"}</code> in the text and become the real value in each email.</p>
        </div>

        <label className="flex items-start gap-2.5 rounded-xl border border-line p-3 text-sm">
          <input type="checkbox" name="enabled" defaultChecked={enabled} className="mt-0.5 h-4 w-4" />
          <span>
            <span className="font-semibold">Active</span>
            <span className="block text-muted">Untick to pause this email. Requests for it will be refused and logged.</span>
          </span>
        </label>

        <FormMessage state={state} />
        {!readOnly && (
          <div className="flex flex-wrap items-center gap-2">
            <Button pending={pending}>Save</Button>
            {custom && (
              <button type="button" onClick={() => setV(defaults)} className="btn-ghost">Reset to default</button>
            )}
            {dirty && <span className="text-xs font-semibold text-signal">Unsaved changes</span>}
          </div>
        )}
      </fieldset>
      {readOnly && <p className="text-xs text-muted">Only admins can change this.</p>}
      {lastEdited && <p className="text-xs text-muted">{lastEdited}</p>}
    </form>
  );
}
