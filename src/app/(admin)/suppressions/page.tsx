import type { Metadata } from "next";
import { SUPPRESSION_LABELS, type SuppressionReason } from "@/config/constants";
import { requireUserPage } from "@/lib/auth/dal";
import { cn, formatDateTime } from "@/lib/utils";
import { ActionButton } from "@/components/action-button";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { removeSuppressionAction } from "@/server/actions/admin.actions";
import { listSuppressions } from "@/server/services/suppression.service";
import { AddSuppressionForm } from "./add-form";

export const metadata: Metadata = { title: "Block list" };

const TONE: Record<SuppressionReason, string> = {
  BOUNCE: "bg-rose-50 text-rose-700",
  COMPLAINT: "bg-amber-50 text-amber-800",
  MANUAL: "bg-zinc-100 text-zinc-700",
};

export default async function SuppressionsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireUserPage();
  const { q } = await searchParams;
  const rows = await listSuppressions(q);
  const isAdmin = user.role === "ADMIN";

  return (
    <>
      <PageHeader
        title="Block list"
        description="Addresses that bounced or marked you as spam are added here automatically. Emails to them are skipped, which protects your domain's reputation."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="card overflow-hidden">
          <form method="get" className="flex gap-2 border-b border-line p-4">
            <input name="q" defaultValue={q} placeholder="Find an address" className="input" aria-label="Find an address" />
            <button type="submit" className="btn-secondary">Search</button>
          </form>
          {rows.length === 0 ? (
            <EmptyState title={q ? "Not on the list" : "No blocked addresses"} text={q ? "This address can receive emails." : "Good news: nothing has bounced."} />
          ) : (
            <ul className="divide-y divide-line">
              {rows.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{r.email}</p>
                    <p className="text-xs text-muted">
                      {formatDateTime(r.createdAt)}
                      {r.detail ? ` · ${r.detail}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("chip", TONE[r.reason as SuppressionReason])}>{SUPPRESSION_LABELS[r.reason as SuppressionReason] ?? r.reason}</span>
                    {isAdmin && (
                      <ActionButton
                        action={removeSuppressionAction.bind(null, r.email)}
                        confirm={r.reason === "COMPLAINT" ? `${r.email} marked your email as spam. Unblock anyway?` : `Unblock ${r.email}?`}
                        className="btn-ghost btn-sm"
                      >
                        Unblock
                      </ActionButton>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        {isAdmin && (
          <aside className="card h-fit p-5">
            <h2 className="section-title">Block an address</h2>
            <p className="mt-1 text-xs text-muted">For people who asked not to be emailed, or test addresses.</p>
            <div className="mt-3">
              <AddSuppressionForm />
            </div>
          </aside>
        )}
      </div>
    </>
  );
}
