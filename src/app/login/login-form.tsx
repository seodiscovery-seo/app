"use client";

import Link from "next/link";
import { useActionState } from "react";
import { PasswordInput } from "@/components/auth/password-input";
import { loginAction, type LoginState } from "@/server/actions/auth.actions";

export function LoginForm({ from }: { from?: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, undefined);
  const fe = state?.fieldErrors;

  return (
    <form action={formAction} className="mt-8 space-y-5" noValidate>
      {from && <input type="hidden" name="from" value={from} />}
      {state?.error && (
        <p role="alert" className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm font-medium text-danger">{state.error}</p>
      )}
      <div>
        <label htmlFor="email" className="label">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" defaultValue={state?.email} required className="input" aria-invalid={fe?.email ? true : undefined} />
        {fe?.email && <p className="mt-1.5 text-xs font-medium text-danger">{fe.email[0]}</p>}
      </div>
      <PasswordInput id="password" name="password" label="Password" autoComplete="current-password" error={fe?.password?.[0]} />
      <div className="-mt-2 text-right">
        <Link href="/forgot-password" className="text-sm font-semibold text-brand hover:underline">Forgot password?</Link>
      </div>
      <button type="submit" disabled={pending} className="btn-primary w-full py-3">{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
