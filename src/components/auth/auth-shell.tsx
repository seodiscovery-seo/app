import type { ReactNode } from "react";
import { initials } from "@/lib/utils";
import { getAllSettings } from "@/server/services/settings.service";

const STACK = [
  { subject: "Welcome to {brand}, Priya", status: "Delivered", tone: "bg-emerald-400/15 text-emerald-300" },
  { subject: "Reset your {brand} password", status: "Delivered", tone: "bg-emerald-400/15 text-emerald-300" },
  { subject: "New sign-in to your account", status: "Sent", tone: "bg-sky-400/15 text-sky-300" },
];

/** Split layout shared by sign-in, sign-up and password pages. */
export async function AuthShell({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  const s = await getAllSettings();
  const brand = s["brand.name"];
  const logo = s["brand.logoUrl"];
  const mark = logo ? (
    <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-xl bg-white p-1">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logo} alt="" className="max-h-full max-w-full object-contain" />
    </span>
  ) : (
    <span className="grid h-11 w-11 place-items-center rounded-xl bg-signal font-bold text-white">{initials(brand) || "E"}</span>
  );

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-navy px-14 py-12 text-white lg:flex lg:flex-col">
        <div className="flex items-center gap-3">
          {mark}
          <span className="text-lg font-bold">{brand}</span>
        </div>
        <div className="my-auto max-w-md">
          <h2 className="text-[2.1rem] font-bold leading-[1.15] tracking-[-0.025em]">Every account email your customers get, in one place.</h2>
          <p className="mt-4 text-white/60">Welcome, verification, password and sign-in alerts. Designed once, sent automatically, tracked until they land.</p>
          <ul className="mt-10 space-y-3" aria-hidden="true">
            {STACK.map((m, i) => (
              <li key={m.subject} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3.5" style={{ marginLeft: `${i * 22}px` }}>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16v12H4zM4 7l8 6 8-6" /></svg>
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{m.subject.replace("{brand}", brand)}</span>
                <span className={`chip ${m.tone}`}>{m.status}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-white/40">Admin access only. Activity is logged.</p>
      </section>

      <section className="flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            {mark}
            <span className="text-lg font-bold">{brand}</span>
          </div>
          <h1 className="text-[1.75rem] font-bold tracking-[-0.02em]">{title}</h1>
          {subtitle && <p className="mt-1.5 text-muted">{subtitle}</p>}
          {children}
        </div>
      </section>
    </main>
  );
}

export function AuthNotice({ tone = "good", children }: { tone?: "good" | "info" | "danger"; children: ReactNode }) {
  const styles = {
    good: "border-emerald-200 bg-emerald-50 text-emerald-800",
    info: "border-brand/20 bg-brand-soft text-[#173f99]",
    danger: "border-danger/20 bg-danger/5 text-danger",
  }[tone];
  return <p role={tone === "danger" ? "alert" : "status"} className={`mt-6 rounded-xl border px-4 py-3 text-sm font-medium ${styles}`}>{children}</p>;
}
