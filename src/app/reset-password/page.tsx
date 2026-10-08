import type { Metadata } from "next";
import Link from "next/link";
import { AuthNotice, AuthShell } from "@/components/auth/auth-shell";
import { checkResetToken } from "@/server/services/account.service";
import { ResetForm } from "./reset-form";

// Always build fresh: these pages depend on live settings and links
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const user = await checkResetToken(token);
  if (!user || !user.isActive || !token) {
    return (
      <AuthShell title="This link has expired" subtitle="Reset links work once and only for 30 minutes.">
        <AuthNotice tone="info">Ask for a new link and use it straight away.</AuthNotice>
        <Link href="/forgot-password" className="btn-primary mt-6 w-full">Send a new link</Link>
      </AuthShell>
    );
  }
  return (
    <AuthShell title="Choose a new password" subtitle={<>For <strong className="text-ink">{user.email}</strong>. You&apos;ll be signed out everywhere else.</>}>
      <ResetForm token={token} />
    </AuthShell>
  );
}
