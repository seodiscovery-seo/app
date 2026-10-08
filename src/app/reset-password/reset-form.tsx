"use client";

import { PasswordInput } from "@/components/auth/password-input";
import { Button, FormMessage, useKeepForm } from "@/components/form-controls";
import { resetPasswordAction, type PublicFormState } from "@/server/actions/auth.actions";

export function ResetForm({ token }: { token: string }) {
  const { state, onSubmit, pending } = useKeepForm<PublicFormState>(resetPasswordAction, undefined);
  const fe = state?.fieldErrors;
  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
      <input type="hidden" name="token" value={token} />
      <FormMessage state={state} />
      <PasswordInput id="password" name="password" label="New password" autoComplete="new-password" error={fe?.password?.[0]} showStrength />
      <PasswordInput id="confirm" name="confirm" label="Confirm new password" autoComplete="new-password" error={fe?.confirm?.[0]} />
      <Button pending={pending} pendingText="Saving…" className="btn-primary w-full py-3">Save new password</Button>
    </form>
  );
}
