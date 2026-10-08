"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import type { NavItem } from "@/config/navigation";
import { cn, initials } from "@/lib/utils";
import { logoutAction } from "@/server/actions/auth.actions";

export function AppShell({ items, user, brandName, logoUrl, live, children }: {
  items: NavItem[];
  user: { name: string; email: string; roleLabel: string };
  brandName: string;
  logoUrl: string;
  live: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const current = items.find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
  const groups = ["Sending", "Sales", "Protection", "Setup"] as const;

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-5 pt-6">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-white p-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl} alt="" className="max-h-full max-w-full object-contain" />
            </span>
          ) : (
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-signal text-sm font-bold text-white">
              {initials(brandName) || "E"}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-[0.95rem] font-bold text-white">{brandName}</p>
            <p className="text-xs text-white/50">Email control room</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4" aria-label="Main">
        {groups.map((g) => {
          const list = items.filter((i) => i.group === g);
          if (!list.length) return null;
          return (
            <div key={g}>
              <p className="mb-1.5 px-3 text-[0.7rem] font-semibold text-white/35">{g}</p>
              <ul className="space-y-0.5">
                {list.map((item) => {
                  const active = item === current;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                          active ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white",
                        )}
                      >
                        {active && <span className="absolute -left-3 top-2 bottom-2 w-1 rounded-r-full bg-signal" aria-hidden="true" />}
                        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d={item.icon} />
                        </svg>
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="m-3 rounded-2xl bg-white/5 p-3">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-white">{initials(user.name)}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{user.name}</p>
            <p className="truncate text-xs text-white/50">{user.roleLabel} · {user.email}</p>
          </div>
        </div>
        <div className="mt-2 flex gap-1">
          <Link href="/account" onClick={() => setOpen(false)} className="flex-1 rounded-lg px-2 py-1.5 text-xs font-medium text-white/60 hover:bg-white/5 hover:text-white">
            My account
          </Link>
          <form action={logoutAction} className="flex-1">
            <button type="submit" className="w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium text-white/60 hover:bg-white/5 hover:text-white">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:pl-[260px]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] bg-navy lg:block">{sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" className="absolute inset-0 bg-navy/60" onClick={() => setOpen(false)} aria-label="Close menu" />
          <aside className="relative h-full w-72 bg-navy shadow-2xl">{sidebar}</aside>
        </div>
      )}

      <header className="sticky top-0 z-20 border-b border-line bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-3 px-4 sm:px-6 lg:px-10">
          <button type="button" onClick={() => setOpen(true)} className="-ml-1 rounded-lg p-2 text-muted hover:bg-paper lg:hidden" aria-label="Open menu">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <p className="truncate text-sm text-muted">
            <span className="hidden sm:inline">{brandName} / </span>
            <span className="font-semibold text-ink">{current?.label ?? (pathname.startsWith("/account") ? "My account" : "")}</span>
          </p>
          <div className="ml-auto flex items-center gap-2" role="status">
            {live ? (
              <span className="chip bg-emerald-50 py-1 text-emerald-700 ring-1 ring-emerald-200">
                <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                <span><strong className="font-bold">Live</strong><span className="hidden sm:inline"> · delivering through Resend</span></span>
              </span>
            ) : (
              <Link href="/api-keys#go-live" className="chip bg-signal-soft py-1 text-[#a4480b] ring-1 ring-[#f9cfa8] hover:bg-[#ffe6d1]" title="Emails are saved here but not delivered">
                <span className="h-2 w-2 rounded-full bg-signal" aria-hidden="true" />
                <span><strong className="font-bold">Test mode.</strong><span className="hidden sm:inline"> Emails are saved, not delivered</span></span>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 lg:px-10">{children}</main>
    </div>
  );
}
