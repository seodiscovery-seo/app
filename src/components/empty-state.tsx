import type { ReactNode } from "react";

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <svg viewBox="0 0 48 48" className="h-11 w-11 text-line" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <rect x="8" y="10" width="32" height="28" rx="4" />
        <path d="M8 20h32M16 28h10" />
      </svg>
      <p className="mt-3 font-medium">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
