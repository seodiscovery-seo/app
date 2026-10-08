"use client";

import { Button, FormMessage, useKeepForm } from "@/components/form-controls";
import { forgotPasswordAction, type PublicFormState } from "@/server/actions/auth.actions";

export function ForgotForm({ testMode }: { testMode: boolean }) {
  const { state, onSubmit, pending } = useKeepForm<PublicFormState>(forgotPasswordAction, undefined);

  if (state?.done) {
    return (
      <div className="mt-8 rounded-2xl border border-line bg-paper p-6" role="status">
        <h2 className="text-lg font-bold">Check your inbox</h2>
        <p className="mt-1 text-sm text-muted">
          If an account exists for that email, a reset link is on its way. It works once, for 30 minutes. Check spam if you don&apos;t see it.
        </p>
        {testMode && (
          <p className="mt-4 rounded-xl border border-[#f9cfa8] bg-signal-soft px-3 py-2 text-xs text-[#a4480b]">
            <strong>Test mode:</strong> emails are not delivered. The reset link is printed in the terminal where <code>npm run dev</code> is running.
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
      <FormMessage state={state} />
      <div>
        <label htmlFor="email" className="label">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" />
        {state?.fieldErrors?.email && <p className="mt-1.5 text-xs font-medium text-danger">{state.fieldErrors.email[0]}</p>}
      </div>
      <Button pending={pending} pendingText="Sending…" className="btn-primary w-full py-3">Send reset link</Button>
    </form>
  );
}
