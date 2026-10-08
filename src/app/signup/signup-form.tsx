"use client";

import { PasswordInput } from "@/components/auth/password-input";
import { Button, FormMessage, useKeepForm } from "@/components/form-controls";
import { signupAction, type PublicFormState } from "@/server/actions/auth.actions";

export function SignupForm({ domain }: { domain: string }) {
  const { state, onSubmit, pending } = useKeepForm<PublicFormState>(signupAction, undefined);
  const fe = state?.fieldErrors;

  if (state?.done) {
    return (
      <div className="mt-8 rounded-2xl border border-line bg-paper p-6 text-center" role="status">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-soft text-brand" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16v12H4zM4 7l8 6 8-6" /></svg>
        </span>
        <h2 className="mt-4 text-lg font-bold">Check your inbox</h2>
        <p className="mt-1 text-sm text-muted">We&apos;ve sent a link to confirm your email. It works for 60 minutes. Didn&apos;t get it? Check spam, or sign up again to resend.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
      <FormMessage state={state} />
      <div>
        <label htmlFor="name" className="label">Your name</label>
        <input id="name" name="name" autoComplete="name" required className="input" />
        {fe?.name && <p className="mt-1.5 text-xs font-medium text-danger">{fe.name[0]}</p>}
      </div>
      <div>
        <label htmlFor="email" className="label">Work email</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" placeholder={domain ? `name@${domain}` : "name@company.com"} />
        {fe?.email && <p className="mt-1.5 text-xs font-medium text-danger">{fe.email[0]}</p>}
      </div>
      <PasswordInput id="password" name="password" label="Password" autoComplete="new-password" error={fe?.password?.[0]} showStrength />
      <PasswordInput id="confirm" name="confirm" label="Confirm password" autoComplete="new-password" error={fe?.confirm?.[0]} />
      <Button pending={pending} pendingText="Creating account…" className="btn-primary w-full py-3">Create account</Button>
      <p className="text-center text-xs text-muted">New accounts can view everything. An admin can give you edit rights.</p>
    </form>
  );
}
