"use client";

import { useEffect, useRef, useState } from "react";
import type { FormState } from "@/lib/form";
import { PasswordInput } from "@/components/auth/password-input";
import { Button, FormMessage, useKeepForm } from "@/components/form-controls";
import { changePasswordAction } from "@/server/actions/auth.actions";

export function ChangePasswordForm() {
  const { state, onSubmit, pending } = useKeepForm<FormState>(changePasswordAction, undefined);
  const [k, setK] = useState(0);
  const prev = useRef(state);
  useEffect(() => {
    if (state !== prev.current && state?.ok) setK((n) => n + 1); // clear the fields after success
    prev.current = state;
  }, [state]);
  const fe = state?.fieldErrors;
  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <FormMessage state={state} />
      <div key={k} className="space-y-5">
        <PasswordInput id="current" name="current" label="Current password" autoComplete="current-password" error={fe?.current?.[0]} />
        <PasswordInput id="password" name="password" label="New password" autoComplete="new-password" error={fe?.password?.[0]} showStrength />
        <PasswordInput id="confirm" name="confirm" label="Confirm new password" autoComplete="new-password" error={fe?.confirm?.[0]} />
      </div>
      <Button pending={pending}>Change password</Button>
    </form>
  );
}
