import Link from "next/link";

export function Pagination({ page, totalPages, total, pageSize, params }: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  params: Record<string, string | undefined>;
}) {
  if (total === 0) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== "page") sp.set(k, v);
    sp.set("page", String(p));
    return `?${sp.toString()}`;
  };
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm">
      <p className="text-muted">
        {from}–{to} of {total}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className="btn-secondary btn-sm">Previous</Link>
        ) : (
          <span className="btn-secondary btn-sm opacity-40">Previous</span>
        )}
        {page < totalPages ? (
          <Link href={href(page + 1)} className="btn-secondary btn-sm">Next</Link>
        ) : (
          <span className="btn-secondary btn-sm opacity-40">Next</span>
        )}
      </div>
    </div>
  );
}
