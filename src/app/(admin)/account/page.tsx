import type { Metadata } from "next";
import { ROLE_LABELS } from "@/config/constants";
import { requireUserPage } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { formatDateTime, initials } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { ChangePasswordForm } from "./change-password-form";

export const metadata: Metadata = { title: "My account" };

export default async function AccountPage() {
  const me = await requireUserPage();
  const user = await db.user.findUniqueOrThrow({ where: { id: me.id }, select: { createdAt: true, lastLoginAt: true } });
  return (
    <>
      <PageHeader title="My account" description="Your sign-in details and password." />
      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <section className="card h-fit p-6">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-brand text-lg font-bold text-white">{initials(me.name)}</span>
          <h2 className="mt-4 text-lg font-bold">{me.name}</h2>
          <p className="text-sm text-muted">{me.email}</p>
          <dl className="mt-5 space-y-3 border-t border-line pt-4 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-muted">Role</dt><dd className="font-semibold">{ROLE_LABELS[me.role]}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">Member since</dt><dd>{formatDateTime(user.createdAt)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">Last sign-in</dt><dd>{formatDateTime(user.lastLoginAt)}</dd></div>
          </dl>
        </section>
        <section className="card p-6">
          <h2 className="section-title">Change password</h2>
          <p className="mt-1 text-sm text-muted">You&apos;ll stay signed in here. Every other device is signed out, and you&apos;ll get an email about the change.</p>
          <div className="mt-5 max-w-md">
            <ChangePasswordForm />
          </div>
        </section>
      </div>
    </>
  );
}
