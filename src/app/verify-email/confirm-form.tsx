"use client";

import { Button, FormMessage, useKeepForm } from "@/components/form-controls";
import { confirmEmailAction, type PublicFormState } from "@/server/actions/auth.actions";

export function ConfirmForm({ token }: { token: string }) {
  const { state, onSubmit, pending } = useKeepForm<PublicFormState>(confirmEmailAction, undefined);
  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      <input type="hidden" name="token" value={token} />
      <FormMessage state={state} />
      <Button pending={pending} pendingText="Confirming…" className="btn-primary w-full py-3">Confirm my email</Button>
    </form>
  );
}
