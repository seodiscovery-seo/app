import { cn } from "@/lib/utils";

const STYLES: Record<string, { label: string; cls: string; dot: string }> = {
  DRAFT: { label: "Draft", cls: "bg-zinc-100 text-zinc-700", dot: "bg-zinc-400" },
  SENT: { label: "Sent", cls: "bg-sky-50 text-sky-700", dot: "bg-sky-500" },
  VIEWED: { label: "Viewed", cls: "bg-violet-50 text-violet-700", dot: "bg-violet-500" },
  ACCEPTED: { label: "Accepted", cls: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  DECLINED: { label: "Declined", cls: "bg-rose-50 text-rose-700", dot: "bg-rose-500" },
  EXPIRED: { label: "Expired", cls: "bg-amber-50 text-amber-800", dot: "bg-amber-500" },
};

export function QuoteStatus({ status, className }: { status: string; className?: string }) {
  const s = STYLES[status] ?? STYLES.DRAFT!;
  return (
    <span className={cn("chip", s.cls, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} aria-hidden="true" />
      {s.label}
    </span>
  );
}
