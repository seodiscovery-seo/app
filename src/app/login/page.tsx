import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { AuthNotice, AuthShell } from "@/components/auth/auth-shell";
import { getSetting } from "@/server/services/settings.service";
import { LoginForm } from "./login-form";

// Always build fresh: these pages depend on live settings and links
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ verified?: string; reset?: string; from?: string }> }) {
  if (await getCurrentUser()) redirect("/dashboard");
  const [sp, allowSignup] = await Promise.all([searchParams, getSetting("auth.allowSignup")]);

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to manage your app's emails.">
      {sp.verified && <AuthNotice>Email confirmed. Your account is ready, sign in below.</AuthNotice>}
      {sp.reset && <AuthNotice>Password changed. Sign in with your new password.</AuthNotice>}
      <LoginForm from={sp.from} />
      {allowSignup && (
        <p className="mt-8 text-center text-sm text-muted">
          New here? <Link href="/signup" className="font-semibold text-brand hover:underline">Create an account</Link>
        </p>
      )}
    </AuthShell>
  );
}
