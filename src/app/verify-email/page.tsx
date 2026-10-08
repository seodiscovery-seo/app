import type { Metadata } from "next";
import Link from "next/link";
import { AuthNotice, AuthShell } from "@/components/auth/auth-shell";
import { checkVerifyToken } from "@/server/services/account.service";
import { ConfirmForm } from "./confirm-form";

// Always build fresh: these pages depend on live settings and links
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Confirm email" };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const user = await checkVerifyToken(token);
  if (!user || !token) {
    return (
      <AuthShell title="This link doesn't work anymore" subtitle="Confirmation links work once and expire after 60 minutes.">
        <AuthNotice tone="info">Already confirmed? Just sign in. Otherwise sign up again with the same email to get a fresh link.</AuthNotice>
        <div className="mt-6 grid gap-2">
          <Link href="/login" className="btn-primary">Sign in</Link>
          <Link href="/signup" className="btn-secondary">Get a new link</Link>
        </div>
      </AuthShell>
    );
  }
  return (
    <AuthShell title="Confirm your email" subtitle={<>Hi {user.name}, press the button to activate <strong className="text-ink">{user.email}</strong>.</>}>
      <ConfirmForm token={token} />
    </AuthShell>
  );
}
