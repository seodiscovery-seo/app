import { STATUS_LABELS, STATUS_STYLES, type EmailStatus } from "@/config/constants";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("chip", STATUS_STYLES[status as EmailStatus] ?? "bg-paper text-muted")}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
      {STATUS_LABELS[status as EmailStatus] ?? status}
    </span>
  );
}
