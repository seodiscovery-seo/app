"use client";

import { useEffect, useRef } from "react";
import { ROLE_LABELS, USER_ROLES } from "@/config/constants";
import type { FormState } from "@/lib/form";
import { Button, Field, FormMessage, useKeepForm } from "@/components/form-controls";
import { createUserAction, updateUserAction } from "@/server/actions/admin.actions";

export function NewUserForm() {
  const { state, onSubmit, pending } = useKeepForm<FormState>(createUserAction, undefined);
  const ref = useRef<HTMLFormElement>(null);
  const fe = state?.fieldErrors;
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} onSubmit={onSubmit} className="space-y-3">
      <FormMessage state={state} />
      <Field label="Name" name="nu-name" error={fe?.name}>
        <input id="nu-name" name="name" className="input" required />
      </Field>
      <Field label="Email" name="nu-email" error={fe?.email}>
        <input id="nu-email" name="email" type="email" className="input" required />
      </Field>
      <Field label="Role" name="nu-role">
        <select id="nu-role" name="role" className="input" defaultValue="VIEWER">
          {USER_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
      </Field>
      <Field label="Password" name="nu-password" error={fe?.password} hint="At least 8 characters. Share it privately.">
        <input id="nu-password" name="password" type="password" autoComplete="new-password" className="input" required />
      </Field>
      <Button pending={pending}>Add user</Button>
    </form>
  );
}

export function UserRowForm({ user }: { user: { id: string; role: string; isActive: boolean } }) {
  const { state, onSubmit, pending } = useKeepForm<FormState>(updateUserAction, undefined);
  const fe = state?.fieldErrors;
  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-lg border border-line p-3 sm:grid-cols-3">
      <input type="hidden" name="id" value={user.id} />
      <div className="sm:col-span-3"><FormMessage state={state} /></div>
      <Field label="Role" name={`role-${user.id}`}>
        <select id={`role-${user.id}`} name="role" className="input" defaultValue={user.role}>
          {USER_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
      </Field>
      <Field label="New password (optional)" name={`pw-${user.id}`} error={fe?.password}>
        <input id={`pw-${user.id}`} name="password" type="password" autoComplete="new-password" className="input" />
      </Field>
      <label className="flex items-center gap-2 self-end pb-2 text-sm">
        <input type="checkbox" name="isActive" defaultChecked={user.isActive} className="h-4 w-4" />
        Can sign in
      </label>
      <div className="sm:col-span-3"><Button pending={pending} className="btn-secondary">Save</Button></div>
    </form>
  );
}
