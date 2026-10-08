import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Notice({ tone = "good", children }: { tone?: "good" | "warn" | "danger" | "info"; children: ReactNode }) {
  return (
    <p
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "mb-4 rounded-lg border px-3 py-2 text-sm",
        tone === "good" && "border-good/25 bg-good/5 text-good",
        tone === "warn" && "border-warn/25 bg-warn/5 text-warn",
        tone === "danger" && "border-danger/25 bg-danger/5 text-danger",
        tone === "info" && "border-brand/20 bg-brand-soft text-brand",
      )}
    >
      {children}
    </p>
  );
}
