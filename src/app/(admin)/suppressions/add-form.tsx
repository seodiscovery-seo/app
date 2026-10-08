"use client";

import { useEffect, useRef } from "react";
import type { FormState } from "@/lib/form";
import { Button, FormMessage, useKeepForm } from "@/components/form-controls";
import { addSuppressionAction } from "@/server/actions/admin.actions";

export function AddSuppressionForm() {
  const { state, onSubmit, pending } = useKeepForm<FormState>(addSuppressionAction, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} onSubmit={onSubmit} className="space-y-3">
      <FormMessage state={state} />
      <input name="email" type="email" required placeholder="name@example.com" className="input" aria-label="Email address" />
      <input name="detail" placeholder="Reason (optional)" className="input" aria-label="Reason" />
      <Button pending={pending}>Block address</Button>
    </form>
  );
}
