"use client";

import { useFormStatus } from "react-dom";
import { useActionState, useTransition, type FormEvent, type ReactNode } from "react";
import type { FormState } from "@/lib/form";

export function SubmitButton({ children, pendingText = "Saving…", className = "btn-primary" }: {
  children: ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingText : children}
    </button>
  );
}

export function FormMessage({ state }: { state: FormState }) {
  if (state?.error) {
    return (
      <p role="alert" className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
        {state.error}
      </p>
    );
  }
  if (state?.ok && state.message) {
    return (
      <p role="status" className="rounded-md border border-good/30 bg-good/5 px-3 py-2 text-sm text-good">
        {state.message}
      </p>
    );
  }
  return null;
}

export function Field({ label, name, error, hint, children }: {
  label: string;
  name: string;
  error?: string[];
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={name} className="label">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1 text-xs text-danger">{error[0]}</p>}
    </div>
  );
}

/**
 * Like useActionState, but the form keeps what the user typed after a failed save
 * (React 19 resets uncontrolled fields when a form `action` finishes).
 * Usage: const { state, onSubmit, pending } = useKeepForm(action); <form onSubmit={onSubmit}>
 */
export function useKeepForm<S>(action: (prev: S, formData: FormData) => Promise<S>, initial: S) {
  const [state, formAction, pending] = useActionState(
    action as (prev: Awaited<S>, formData: FormData) => Promise<Awaited<S>>,
    initial as Awaited<S>,
  );
  const [, startTransition] = useTransition();
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => formAction(fd));
  };
  return { state, onSubmit, pending };
}

export function Button({ pending, children, pendingText = "Saving…", className = "btn-primary" }: {
  pending: boolean;
  children: ReactNode;
  pendingText?: string;
  className?: string;
}) {
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingText : children}
    </button>
  );
}
