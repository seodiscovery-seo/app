"use client";

import { useEffect, useState } from "react";

/** A small, scaled-down live render of an email (uses the same preview API as the editor). */
export function EmailThumb({ templateKey, title }: { templateKey: string; title: string }) {
  const [html, setHtml] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(`/api/admin/preview?template=${encodeURIComponent(templateKey)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.text() : null))
      .then((t) => alive && setHtml(t))
      .catch(() => alive && setHtml(null));
    return () => {
      alive = false;
    };
  }, [templateKey]);

  return (
    <div className="relative h-52 overflow-hidden rounded-t-2xl border-b border-line bg-[#eef1f7]" aria-hidden="true">
      {html ? (
        <iframe
          title={`${title} preview`}
          srcDoc={html}
          sandbox=""
          tabIndex={-1}
          loading="lazy"
          className="pointer-events-none absolute left-1/2 top-3 h-[900px] w-[640px] origin-top -translate-x-1/2 scale-[0.5] rounded-lg bg-white shadow-sm"
        />
      ) : (
        <div className="absolute inset-x-8 top-6 space-y-2.5">
          <div className="h-3 w-24 animate-pulse rounded bg-white" />
          <div className="h-32 animate-pulse rounded-lg bg-white" />
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#eef1f7] to-transparent" />
    </div>
  );
}
