import type { Metadata } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { requireUserPage } from "@/lib/auth/dal";
import { env, isLiveMode } from "@/lib/env";
import { cn, formatDateTime } from "@/lib/utils";
import { ActionButton } from "@/components/action-button";
import { PageHeader } from "@/components/page-header";
import { revokeApiKeyAction } from "@/server/actions/admin.actions";
import { listApiKeys } from "@/server/services/apikey.service";
import { getSetting } from "@/server/services/settings.service";
import { CreateKeyForm } from "./create-key-form";

export const metadata: Metadata = { title: "API & setup" };

export default async function ApiKeysPage() {
  const user = await requireUserPage();
  const [keys, fromEmail, h] = await Promise.all([listApiKeys(), getSetting("sending.fromEmail"), headers()]);
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3000"}`;
  const isAdmin = user.role === "ADMIN";

  return (
    <>
      <PageHeader title="API & setup" description="Connect your website, then switch from test mode to real delivery." />

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 p-5">
          <div>
            <h2 className="section-title">API keys</h2>
            <p className="mt-1 text-sm text-muted">Your website sends this key with every request. Keep it on the server, never in browser code.</p>
          </div>
        </div>
        {keys.length > 0 && (
          <ul className="divide-y divide-line border-t border-line">
            {keys.map((k) => (
              <li key={k.id} className={cn("flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm", k.revokedAt && "text-muted")}>
                <div>
                  <p className="font-medium">{k.name}</p>
                  <p className="text-xs text-muted">
                    <code className="code">{k.prefix}…</code> · created {formatDateTime(k.createdAt)} · {k.lastUsedAt ? `last used ${formatDateTime(k.lastUsedAt)}` : "never used"}
                  </p>
                </div>
                {k.revokedAt ? (
                  <span className="chip bg-zinc-100 text-zinc-600">Revoked</span>
                ) : (
                  isAdmin && (
                    <ActionButton action={revokeApiKeyAction.bind(null, k.id)} confirm={`Revoke "${k.name}"? Requests using it will stop working immediately.`} className="btn-ghost btn-sm text-danger">
                      Revoke
                    </ActionButton>
                  )
                )}
              </li>
            ))}
          </ul>
        )}
        {isAdmin && (
          <div className="border-t border-line bg-paper/50 p-5">
            <CreateKeyForm />
          </div>
        )}
      </section>

      <section className="card mt-6 p-5">
        <h2 className="section-title">Send an email from your app</h2>
        <p className="mt-1 text-sm text-muted">One request per email. The answer tells you if it was sent, and why not if it wasn&apos;t.</p>
        <Code>{`curl -X POST ${origin}/api/v1/send \\
  -H "Authorization: Bearer ek_your_api_key" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: reset-user123-1696579200" \\
  -d '{
    "template": "password-reset",
    "to": "user@example.com",
    "data": { "name": "Priya", "resetUrl": "https://app.example.com/reset?token=abc", "expiresInMinutes": 30 }
  }'`}</Code>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b border-line">
              <tr><th className="th pl-0">Answer</th><th className="th">Meaning</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[
                ["200 ok: true", "Sent (or created in test mode). Same Idempotency-Key again returns duplicate: true and nothing new is sent."],
                ["400", "Data is wrong or missing. issues lists exactly which field."],
                ["401", "API key missing, wrong or revoked."],
                ["409", "That email is paused in the admin panel."],
                ["422", "The address is on the block list."],
                ["429", "More than 120 requests a minute with one key."],
                ["502", "Resend refused or didn't answer after 3 tries. See Logs."],
              ].map(([code, text]) => (
                <tr key={code}><td className="td pl-0 font-mono text-xs">{code}</td><td className="td text-muted">{text}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="go-live" className="card mt-6 scroll-mt-20 p-5">
        <h2 className="section-title">Go live with Resend</h2>
        <p className="mt-1 text-sm text-muted">Current mode: <strong className="text-ink">{isLiveMode() ? "Live" : "Test"}</strong>. Do these once.</p>
        <ol className="mt-4 space-y-4 text-sm">
          <Step n={1} title="Create a free Resend account" done={false}>
            Sign up at <span className="code">resend.com</span>.
          </Step>
          <Step n={2} title="Add and verify your domain" done={false}>
            In Resend open <strong>Domains → Add domain</strong>. Use a sub-domain such as <span className="code">mail.yourdomain.com</span>.
            Resend shows a few DNS records (SPF, DKIM, and a DMARC suggestion). Add each one in your domain panel (GoDaddy, Hostinger, Cloudflare…), then press <strong>Verify</strong>. It can take a few minutes to a few hours.
          </Step>
          <Step n={3} title="Set the From address in Settings" done={!!fromEmail}>
            Example: <span className="code">no-reply@mail.yourdomain.com</span>. It must use the verified domain.
          </Step>
          <Step n={4} title="Add the API key to .env" done={!!env.RESEND_API_KEY}>
            In Resend: <strong>API Keys → Create</strong> (permission: Sending access). Paste it into <span className="code">.env</span> as <span className="code">RESEND_API_KEY=&quot;re_…&quot;</span>, then restart the app.
          </Step>
          <Step n={5} title="Turn on bounce tracking" done={!!env.RESEND_WEBHOOK_SECRET} id="webhook">
            In Resend: <strong>Webhooks → Add endpoint</strong>, URL <span className="code break-all">{origin}/api/webhooks/resend</span>, events: sent, delivered, delivery delayed, bounced, complained.
            Copy the signing secret into <span className="code">.env</span> as <span className="code">RESEND_WEBHOOK_SECRET=&quot;whsec_…&quot;</span> and restart.
            The app must be online on a public address for this (not localhost).
          </Step>
        </ol>
      </section>
    </>
  );
}

function Step({ n, title, done, children, id }: { n: number; title: string; done: boolean; children: ReactNode; id?: string }) {
  return (
    <li id={id} className="flex scroll-mt-20 gap-3">
      <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold", done ? "bg-emerald-600 text-white" : "bg-ink text-white")} aria-hidden="true">
        {done ? "✓" : n}
      </span>
      <div>
        <p className="font-medium">{title}{done && <span className="sr-only"> (done)</span>}</p>
        <p className="mt-0.5 text-muted">{children}</p>
      </div>
    </li>
  );
}

function Code({ children }: { children: string }) {
  return <pre className="mt-3 overflow-x-auto rounded-lg bg-ink p-4 font-mono text-xs leading-relaxed text-slate-100">{children}</pre>;
}
