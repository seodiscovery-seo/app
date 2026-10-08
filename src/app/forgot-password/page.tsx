import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { isLiveMode } from "@/lib/env";
import { ForgotForm } from "./forgot-form";

// Always build fresh: these pages depend on live settings and links
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Forgot your password?" subtitle="Enter your email and we'll send you a link to choose a new one.">
      <ForgotForm testMode={!isLiveMode()} />
      <p className="mt-8 text-center text-sm text-muted">
        Remembered it? <Link href="/login" className="font-semibold text-brand hover:underline">Back to sign in</Link>
      </p>
    </AuthShell>
  );
}
