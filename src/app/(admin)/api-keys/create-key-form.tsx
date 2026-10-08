"use client";

import { useState } from "react";
import { Button, FormMessage, useKeepForm } from "@/components/form-controls";
import { createApiKeyAction, type ApiKeyState } from "@/server/actions/admin.actions";

export function CreateKeyForm() {
  const { state, onSubmit, pending } = useKeepForm<ApiKeyState>(createApiKeyAction, undefined);
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-3">
      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
        <div className="min-w-56 flex-1">
          <label htmlFor="key-name" className="label">New key name</label>
          <input id="key-name" name="name" placeholder="e.g. Website production" className="input" required />
        </div>
        <Button pending={pending} pendingText="Creating…">Create key</Button>
      </form>
      <FormMessage state={state} />
      {state?.key && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-brand/30 bg-brand-soft p-3">
          <code className="flex-1 break-all font-mono text-sm">{state.key}</code>
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => {
              void navigator.clipboard?.writeText(state.key ?? "");
              setCopied(true);
            }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
    </div>
  );
}
