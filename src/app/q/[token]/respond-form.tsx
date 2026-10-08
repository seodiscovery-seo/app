"use client";

import { useActionState, useState } from "react";
import { respondQuoteAction, type RespondState } from "@/server/actions/quote.actions";

export function RespondForm({ token, status, clientName, answeredNote }: { token: string; status: string; clientName: string; answeredNote: string | null }) {
  const [state, formAction, pending] = useActionState<RespondState, FormData>(respondQuoteAction, undefined);
  const [declining, setDeclining] = useState(false);
  const final = state?.answered ?? (status === "ACCEPTED" || status === "DECLINED" ? status : null);

  if (final === "ACCEPTED") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center" role="status">
        <p className="text-lg font-bold text-emerald-800">Thank you, {clientName}! 🎉</p>
        <p className="mt-1 text-sm text-emerald-800">You&apos;ve accepted this quotation. We&apos;ll be in touch shortly with next steps.</p>
      </div>
    );
  }
  if (final === "DECLINED") {
    return (
      <div className="rounded-2xl border border-line bg-white p-5 text-center" role="status">
        <p className="font-bold">You declined this quotation.</p>
        <p className="mt-1 text-sm text-muted">{answeredNote ? `Your note: “${answeredNote}”. ` : ""}Thank you for letting us know. Reply to our email if you&apos;d like a different option.</p>
      </div>
    );
  }
  if (status === "EXPIRED") {
    return <p className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center text-sm font-medium text-amber-800">This quotation has expired. Please reply to our email for an updated one.</p>;
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      {state?.error && <p role="alert" className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm font-medium text-danger">{state.error}</p>}
      {declining ? (
        <>
          <label htmlFor="note" className="label">Would you like to tell us why? <span className="font-normal text-muted">(optional)</span></label>
          <textarea id="note" name="note" rows={3} className="input" placeholder="e.g. Budget is lower right now" />
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="submit" name="answer" value="DECLINED" disabled={pending} className="btn-danger py-3">{pending ? "Sending…" : "Decline quotation"}</button>
            <button type="button" onClick={() => setDeclining(false)} className="btn-secondary py-3">Back</button>
          </div>
        </>
      ) : (
        <>
          <p className="text-center text-sm text-muted">Happy with this quotation?</p>
          <div className="grid gap-2 sm:grid-cols-[2fr_1fr]">
            <button type="submit" name="answer" value="ACCEPTED" disabled={pending} className="btn-primary py-3 text-base">{pending ? "Sending…" : "Accept quotation"}</button>
            <button type="button" onClick={() => setDeclining(true)} className="btn-secondary py-3">Decline</button>
          </div>
        </>
      )}
    </form>
  );
}
