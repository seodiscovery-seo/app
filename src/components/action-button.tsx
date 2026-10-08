"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import type { ActionResult } from "@/lib/errors";

/**
 * Button that runs a server action (optionally after a confirm prompt),
 * shows errors, and refreshes the page on success.
 */
export function ActionButton<T>({
  action,
  confirm: confirmText,
  children,
  className = "btn-secondary",
  pendingText,
  onDone,
}: {
  action: () => Promise<ActionResult<T> | undefined | void>;
  confirm?: string;
  children: ReactNode;
  className?: string;
  pendingText?: string;
  onDone?: (data: T | undefined) => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className={className.includes("w-full") ? "flex w-full flex-col" : "inline-flex flex-col"}>
      <button
        type="button"
        disabled={pending}
        className={className}
        onClick={() => {
          if (confirmText && !window.confirm(confirmText)) return;
          setError(null);
          start(async () => {
            const res = await action();
            if (res && !res.ok) {
              setError(res.error);
              return;
            }
            onDone?.(res && res.ok ? res.data : undefined);
            router.refresh();
          });
        }}
      >
        {pending ? (pendingText ?? "Working…") : children}
      </button>
      {error && <span role="alert" className="mt-1 text-xs text-danger">{error}</span>}
    </span>
  );
}
