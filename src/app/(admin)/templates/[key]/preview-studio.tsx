"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button, FormMessage, useKeepForm } from "@/components/form-controls";
import { sendTestAction, type TestSendState } from "@/server/actions/admin.actions";

type View = "desktop" | "mobile" | "text";

export type SimpleField = { name: string; label: string; optional: boolean; kind?: "url" | "number" | "long" };

export function PreviewStudio({ templateKey, sampleJson, canSend, defaultTo, editor, fields }: {
  templateKey: string;
  sampleJson: string;
  canSend: boolean;
  defaultTo: string;
  editor?: ReactNode;
  fields: SimpleField[];
}) {
  const [draft, setDraft] = useState<string | null>(null);
  useEffect(() => {
    const onDraft = (e: Event) => setDraft(JSON.stringify((e as CustomEvent).detail));
    window.addEventListener("email-draft", onDraft);
    return () => window.removeEventListener("email-draft", onDraft);
  }, []);
  const [view, setView] = useState<View>("desktop");
  const [json, setJson] = useState(sampleJson);
  const [html, setHtml] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { state, onSubmit, pending } = useKeepForm<TestSendState>(sendTestAction, undefined);

  // Re-render the preview shortly after the data stops changing
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        JSON.parse(json);
      } catch {
        setProblem("The sample data isn't valid JSON yet. Check quotes and commas.");
        return;
      }
      setLoading(true);
      const params = new URLSearchParams({ template: templateKey, data: json, ...(view === "text" ? { format: "text" } : {}), ...(draft ? { draft } : {}) });
      const res = await fetch(`/api/admin/preview?${params}`, { cache: "no-store" });
      const body = await res.text();
      if (cancelled) return;
      setLoading(false);
      if (res.ok) {
        setProblem(null);
        setHtml(body);
        setSubject(decodeURIComponent(res.headers.get("X-Email-Subject") ?? ""));
      } else {
        setProblem(new DOMParser().parseFromString(body, "text/html").body.querySelector("p")?.textContent ?? "Preview failed.");
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [json, view, templateKey, draft]);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="card h-fit overflow-hidden xl:sticky xl:top-20">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs text-muted">Subject</p>
            <p className="truncate text-sm font-medium">{subject || "…"}</p>
          </div>
          <div className="flex rounded-lg border border-line bg-paper p-0.5 text-sm" role="tablist" aria-label="Preview size">
            {(["desktop", "mobile", "text"] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={cn("rounded-md px-3 py-1.5 capitalize", view === v ? "bg-white font-medium shadow-sm" : "text-muted hover:text-ink")}
              >
                {v === "text" ? "Plain text" : v}
              </button>
            ))}
          </div>
        </div>

        <div
          className="relative flex justify-center overflow-x-auto px-4 py-6"
          style={{ backgroundColor: "#eef0f4", backgroundImage: "radial-gradient(#d5d9e2 1px, transparent 1px)", backgroundSize: "16px 16px" }}
        >
          {problem ? (
            <div role="alert" className="w-full max-w-lg rounded-xl border border-danger/25 bg-white p-5 text-sm">
              <p className="font-medium text-danger">Preview can&apos;t be shown</p>
              <p className="mt-1 whitespace-pre-line text-muted">{problem}</p>
            </div>
          ) : (
            <div
              className={cn(
                "transition-[width] duration-300",
                view === "mobile" ? "w-[391px] rounded-[2.2rem] border-8 border-ink bg-ink shadow-xl" : "w-full max-w-[680px] rounded-xl border border-line bg-white shadow-sm",
              )}
            >
              {view === "mobile" && <div className="mx-auto mb-1 h-1.5 w-20 rounded-full bg-white/25" aria-hidden="true" />}
              <iframe
                title="Email preview"
                sandbox=""
                srcDoc={html}
                className={cn("block w-full bg-white", view === "mobile" ? "h-[600px] rounded-[1.6rem]" : "h-[620px] rounded-xl")}
              />
            </div>
          )}
          {loading && !problem && <span className="absolute right-4 top-3 text-xs text-muted">Updating…</span>}
        </div>
      </section>

      <aside className="space-y-6">
        {editor && (
          <section className="card p-5">
            <h2 className="section-title">Email content</h2>
            <p className="mt-1 text-xs text-muted">Type to change the words. The preview updates as you type; press Save to use it for real emails.</p>
            <div className="mt-4">{editor}</div>
          </section>
        )}
        <section className="card p-5">
          <h2 className="section-title">Try it with example details</h2>
          <p className="mt-1 text-xs text-muted">Only for this preview and test emails. Real emails fill in your customer&apos;s details automatically.</p>
          <div className="mt-4 space-y-3">
            {fields.map((f) => {
              let value = "";
              try {
                const v = (JSON.parse(json) as Record<string, unknown>)[f.name];
                value = v === undefined || v === null ? "" : String(v);
              } catch {
                value = "";
              }
              const update = (val: string) => {
                try {
                  const obj = JSON.parse(json) as Record<string, unknown>;
                  if (val === "" && f.optional) delete obj[f.name];
                  else obj[f.name] = f.kind === "number" && val !== "" ? Number(val) : val;
                  setJson(JSON.stringify(obj, null, 2));
                } catch {
                  /* fix the JSON in Advanced first */
                }
              };
              return (
                <div key={f.name}>
                  <label htmlFor={`sf-${f.name}`} className="mb-1 block text-xs font-semibold">
                    {f.label} {f.optional && <span className="font-normal text-muted">(optional)</span>}
                  </label>
                  {f.kind === "long" ? (
                    <textarea id={`sf-${f.name}`} rows={3} value={value} onChange={(e) => update(e.target.value)} className="input text-sm" />
                  ) : (
                    <input id={`sf-${f.name}`} type={f.kind === "number" ? "number" : f.kind === "url" ? "url" : "text"} value={value} onChange={(e) => update(e.target.value)} className="input text-sm" />
                  )}
                </div>
              );
            })}
          </div>
          <details className="mt-4">
            <summary className="cursor-pointer text-xs font-semibold text-muted hover:text-ink">Advanced: same details as JSON</summary>
            <label htmlFor="sample-data" className="sr-only">Sample data as JSON</label>
            <textarea id="sample-data" value={json} onChange={(e) => setJson(e.target.value)} spellCheck={false} rows={10} className="input mt-2 font-mono text-xs leading-relaxed" />
          </details>
          <button type="button" onClick={() => setJson(sampleJson)} className="btn-ghost btn-sm mt-2">Reset example</button>
        </section>

        {canSend && (
          <section className="card p-5">
            <h2 className="section-title">Send a test</h2>
            <form onSubmit={onSubmit} className="mt-3 space-y-3">
              <input type="hidden" name="template" value={templateKey} />
              <input type="hidden" name="data" value={json} />
              <label htmlFor="test-to" className="sr-only">Send test to</label>
              <input id="test-to" name="to" type="email" defaultValue={defaultTo} className="input" required />
              <FormMessage state={state} />
              {state?.logId && (
                <Link href={`/logs/${state.logId}`} className="block text-sm text-brand underline">Open in logs</Link>
              )}
              <Button pending={pending} pendingText="Sending…">Send test email</Button>
              <p className="text-xs text-muted">Sends this email to you with the saved words and the example details. Marked as a test in Logs.</p>
            </form>
          </section>
        )}
      </aside>
    </div>
  );
}
