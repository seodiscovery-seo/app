"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition, type DragEvent, type FormEvent } from "react";
import { cn } from "@/lib/utils";
import { sendDocumentAction, type SendDocumentState } from "@/server/actions/admin.actions";

const PRESETS = [
  { label: "Quotation", title: "Quotation for SEO services", message: "Hi {name},\n\nThank you for your time today. Your quotation is attached.\n\nIt covers the scope we discussed, timelines and pricing. Reply to this email if you'd like any changes." },
  { label: "Invoice", title: "Invoice for October 2026", message: "Hi {name},\n\nPlease find your invoice attached. Payment details are on the invoice.\n\nThank you for working with us." },
  { label: "Proposal", title: "Proposal for your website", message: "Hi {name},\n\nAs promised, our proposal is attached. It explains what we recommend, why, and the expected results.\n\nHappy to walk you through it on a call." },
  { label: "Report", title: "Monthly SEO report", message: "Hi {name},\n\nYour monthly report is attached. Highlights: rankings, traffic and the work done this month.\n\nLet us know if you have any questions." },
];

const fmt = (n: number) => {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  const mb = n / 1024 / 1024;
  return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
};
const typeOf = (name: string) => {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return ext === "pdf" ? "PDF" : ["png", "jpg", "jpeg", "webp"].includes(ext) ? "Image" : ext === "docx" ? "Word" : ext === "xlsx" ? "Excel" : ext === "pptx" ? "PowerPoint" : ext.toUpperCase();
};

export function SendDocumentForm({ accept, limits, live }: { accept: string; limits: { maxFiles: number; maxFileBytes: number; maxTotalBytes: number }; live: boolean }) {
  const [state, formAction, pending] = useActionState<SendDocumentState, FormData>(sendDocumentAction, undefined);
  const [, start] = useTransition();
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [f, setF] = useState({ to: "", name: "", title: PRESETS[0]!.title, message: PRESETS[0]!.message, actionUrl: "", buttonText: "" });
  const [html, setHtml] = useState("");
  const [subject, setSubject] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fe = state?.fieldErrors;
  const allowed = accept.split(",");

  const personal = f.message.replaceAll("{name}", f.name || "there");

  // Live preview of the real email
  useEffect(() => {
    const t = setTimeout(async () => {
      const data: Record<string, string> = { name: f.name || "there", title: f.title || "Your document", message: personal };
      if (/^https?:\/\//.test(f.actionUrl)) {
        data.actionUrl = f.actionUrl;
        if (f.buttonText) data.buttonText = f.buttonText;
      }
      const meta = files.map((x) => ({ filename: x.name, size: x.size, type: typeOf(x.name) }));
      const params = new URLSearchParams({ template: "document", data: JSON.stringify(data), files: JSON.stringify(meta) });
      const res = await fetch(`/api/admin/preview?${params}`, { cache: "no-store" });
      if (res.ok) {
        setHtml(await res.text());
        setSubject(decodeURIComponent(res.headers.get("X-Email-Subject") ?? ""));
      }
    }, 350);
    return () => clearTimeout(t);
  }, [f, files, personal]);

  function addFiles(list: FileList | File[]) {
    setFileError(null);
    const next = [...files];
    for (const file of Array.from(list)) {
      const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
      if (!allowed.includes(ext)) {
        setFileError(`"${file.name}" can't be sent. Use PDF, JPG, PNG, WEBP, DOCX, XLSX, PPTX, CSV or TXT.`);
        continue;
      }
      if (file.size > limits.maxFileBytes) {
        setFileError(`"${file.name}" is ${fmt(file.size)}. Each file can be up to ${fmt(limits.maxFileBytes)}.`);
        continue;
      }
      if (next.some((x) => x.name === file.name && x.size === file.size)) continue;
      next.push(file);
    }
    if (next.length > limits.maxFiles) {
      setFileError(`Attach up to ${limits.maxFiles} files.`);
      next.length = limits.maxFiles;
    }
    if (next.reduce((s, x) => s + x.size, 0) > limits.maxTotalBytes) {
      setFileError(`Files together must be under ${fmt(limits.maxTotalBytes)}.`);
      return;
    }
    setFiles(next);
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.delete("files");
    fd.set("message", personal);
    files.forEach((file) => fd.append("files", file));
    start(() => formAction(fd));
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  if (state?.ok) {
    return (
      <div className="card max-w-xl p-8 text-center" role="status">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="m5 12 4 4 10-10" /></svg>
        </span>
        <h2 className="mt-4 text-xl font-bold">{live ? "Sent" : "Created in test mode"}</h2>
        <p className="mt-1 text-muted">{state.message} {files.length} file{files.length === 1 ? "" : "s"} attached.</p>
        <div className="mt-6 flex justify-center gap-2">
          {state.logId && <Link href={`/logs/${state.logId}`} className="btn-secondary">Open in logs</Link>}
          <button type="button" className="btn-primary" onClick={() => window.location.reload()}>Send another</button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <form ref={formRef} onSubmit={onSubmit} className="card space-y-5 p-6" noValidate>
        {state?.error && <p role="alert" className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm font-medium text-danger">{state.error}</p>}

        <div>
          <p className="label">What are you sending?</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setF((v) => ({ ...v, title: p.title, message: p.message }))}
                className={cn("rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors", f.title === p.title ? "border-brand bg-brand-soft text-brand" : "border-line text-muted hover:text-ink")}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="to" className="label">Client email</label>
            <input id="to" name="to" type="email" required value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} className="input" placeholder="client@company.com" />
            {fe?.to && <p className="mt-1.5 text-xs font-medium text-danger">{fe.to[0]}</p>}
          </div>
          <div>
            <label htmlFor="name" className="label">Client name</label>
            <input id="name" name="name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="input" placeholder="Priya" />
            {fe?.name && <p className="mt-1.5 text-xs font-medium text-danger">{fe.name[0]}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="title" className="label">Title</label>
          <input id="title" name="title" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className="input" />
          {fe?.title && <p className="mt-1.5 text-xs font-medium text-danger">{fe.title[0]}</p>}
          <p className="mt-1 text-xs text-muted">Used as the heading and the subject.</p>
        </div>

        <div>
          <label htmlFor="message" className="label">Message</label>
          <textarea id="message" name="message" rows={7} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} className="input leading-relaxed" />
          <p className="mt-1 text-xs text-muted"><code className="code">{"{name}"}</code> becomes the client&apos;s name. Leave a blank line for a new paragraph.</p>
        </div>

        <div>
          <p className="label">Files</p>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            className={cn("rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-colors", drag ? "border-brand bg-brand-soft" : "border-line bg-paper/50")}
          >
            <p className="text-sm font-semibold">Drop files here or</p>
            <button type="button" onClick={() => inputRef.current?.click()} className="btn-secondary btn-sm mt-2">Choose files</button>
            <input
              ref={inputRef}
              id="files"
              type="file"
              multiple
              accept={accept}
              className="sr-only"
              aria-label="Choose files"
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <p className="mt-2 text-xs text-muted">PDF, images, Word, Excel, PowerPoint, CSV · up to {limits.maxFiles} files, {fmt(limits.maxFileBytes)} each</p>
          </div>
          {fileError && <p role="alert" className="mt-2 text-xs font-medium text-danger">{fileError}</p>}
          {files.length > 0 && (
            <ul className="mt-3 divide-y divide-line rounded-xl border border-line">
              {files.map((file, i) => (
                <li key={`${file.name}-${i}`} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-[10px] font-bold text-brand">{typeOf(file.name).slice(0, 4)}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{file.name}</span>
                  <span className="text-xs text-muted">{fmt(file.size)}</span>
                  <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} className="btn-ghost btn-sm" aria-label={`Remove ${file.name}`}>Remove</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <details className="rounded-xl border border-line px-4 py-3">
          <summary className="cursor-pointer text-sm font-semibold">Add a button (optional)</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_180px]">
            <input name="actionUrl" value={f.actionUrl} onChange={(e) => setF({ ...f, actionUrl: e.target.value })} className="input" placeholder="https://… e.g. payment or proposal link" aria-label="Button link" />
            <input name="buttonText" value={f.buttonText} onChange={(e) => setF({ ...f, buttonText: e.target.value })} className="input" placeholder="View online" aria-label="Button text" />
          </div>
          {fe?.actionUrl && <p className="mt-1.5 text-xs font-medium text-danger">{fe.actionUrl[0]}</p>}
        </details>

        <button type="submit" disabled={pending || files.length === 0} className="btn-primary w-full py-3">
          {pending ? "Sending…" : files.length === 0 ? "Attach a file to send" : `Send to ${f.to || "client"}`}
        </button>
      </form>

      <section className="card h-fit overflow-hidden xl:sticky xl:top-20">
        <div className="border-b border-line px-5 py-3">
          <p className="text-xs text-muted">Subject</p>
          <p className="truncate text-sm font-semibold">{subject || "…"}</p>
        </div>
        <div className="bg-[#eef1f7] p-4">
          <iframe title="Document email preview" sandbox="" srcDoc={html} className="block h-[640px] w-full rounded-xl bg-white" />
        </div>
      </section>
    </div>
  );
}
