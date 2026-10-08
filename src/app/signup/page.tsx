import type { Metadata } from "next";
import Link from "next/link";
import { AuthNotice, AuthShell } from "@/components/auth/auth-shell";
import { getAllSettings } from "@/server/services/settings.service";
import { SignupForm } from "./signup-form";

// Always build fresh: these pages depend on live settings and links
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage() {
  const s = await getAllSettings();
  if (!s["auth.allowSignup"]) {
    return (
      <AuthShell title="Sign-ups are closed" subtitle="Accounts for this panel are created by an admin.">
        <AuthNotice tone="info">Ask your admin to add you under Users. They can also turn on sign-ups in Settings.</AuthNotice>
        <Link href="/login" className="btn-secondary mt-6 w-full">Back to sign in</Link>
      </AuthShell>
    );
  }
  const domain = s["auth.signupDomain"];
  return (
    <AuthShell title="Create your account" subtitle={domain ? <>Use your <strong className="text-ink">@{domain}</strong> email address.</> : "It takes less than a minute."}>
      <SignupForm domain={domain} />
      <p className="mt-8 text-center text-sm text-muted">
        Already have an account? <Link href="/login" className="font-semibold text-brand hover:underline">Sign in</Link>
      </p>
    </AuthShell>
  );
}
