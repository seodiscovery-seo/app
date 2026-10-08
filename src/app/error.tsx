"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto max-w-md px-6 py-24">
      <h1 className="text-xl font-semibold">This page failed to load</h1>
      <p className="mt-2 text-sm text-muted">
        The error has been logged{error.digest ? ` (ref ${error.digest})` : ""}. Retry, and if it keeps happening check
        the server logs.
      </p>
      <button
        onClick={reset}
        className="btn-primary mt-6"
      >
        Retry
      </button>
    </main>
  );
}
