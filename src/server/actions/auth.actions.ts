"use server";

import { after } from "next/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { LOGIN_RATE_LIMIT } from "@/config/constants";
import { requireUser } from "@/lib/auth/dal";
import { passwordVersion } from "@/lib/auth/password-version";
import { checkRateLimit, resetRateLimit } from "@/lib/auth/rate-limit";
import { createSession, deleteSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { AppError, zodFieldErrors, type FieldErrors } from "@/lib/errors";
import { formError, type FormState } from "@/lib/form";
import { logger } from "@/lib/logger";
import { changePasswordSchema, forgotSchema, resetSchema, signupSchema } from "@/lib/validations/account";
import { loginSchema } from "@/lib/validations/auth";
import { afterSignIn, changePassword, confirmEmail, requestPasswordReset, resetPassword, signup } from "@/server/services/account.service";
import { verifyCredentials } from "@/server/services/auth.service";

export type LoginState = { error?: string; fieldErrors?: FieldErrors; email?: string } | undefined;

async function clientInfo() {
  const h = await headers();
  return { ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local", ua: h.get("user-agent") };
}

function limited(key: string, max: number, minutes: number) {
  const r = checkRateLimit(key, max, minutes * 60_000);
  if (!r.ok) throw new AppError("RATE_LIMITED", `Too many attempts. Try again in ${Math.ceil(r.retryAfterMs / 60_000)} min.`);
}

// ─── Sign in / out ───────────────────────────────────────────

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "Check the highlighted fields.", fieldErrors: zodFieldErrors(parsed.error) };

  const { email, password } = parsed.data;
  const { ip, ua } = await clientInfo();
  const rateKey = `login:${ip}:${email}`;
  const limit = checkRateLimit(rateKey, LOGIN_RATE_LIMIT.max, LOGIN_RATE_LIMIT.windowMs);
  if (!limit.ok) return { error: `Too many sign-in attempts. Try again in ${Math.ceil(limit.retryAfterMs / 60_000)} min.`, email };

  try {
    const user = await verifyCredentials(email, password);
    if (!user) {
      // Correct password but email not verified yet: say so (they proved they own the account)
      const pending = await db.user.findUnique({ where: { email }, select: { isActive: true, passwordHash: true, id: true } });
      if (pending && !pending.isActive && (await db.setting.findUnique({ where: { key: `signup-pending:${pending.id}` } }))) {
        const { verifyPassword } = await import("@/lib/auth/password");
        if (await verifyPassword(password, pending.passwordHash)) {
          return { error: "Please confirm your email first. Open the link we sent you, or sign up again to get a new link.", email };
        }
      }
      return { error: "Email or password is incorrect.", email };
    }
    const full = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
    await createSession({ userId: user.id, role: user.role, pv: passwordVersion(full.passwordHash) });
    resetRateLimit(rateKey);
    logger.info("User signed in", { userId: user.id });
    after(() => afterSignIn(user.id, ua, ip)); // new-device alert, without slowing the login
  } catch (err) {
    logger.error("Login failed unexpectedly", { error: err });
    return { error: "Sign-in is unavailable right now. Try again shortly.", email };
  }

  const from = String(formData.get("from") ?? "");
  redirect(from.startsWith("/") && !from.startsWith("//") ? from : "/dashboard");
}

export async function logoutAction(): Promise<void> {
  await deleteSession();
  redirect("/login");
}

// ─── Sign up & verify ────────────────────────────────────────

export type PublicFormState = (FormState & { done?: boolean }) | undefined;

export async function signupAction(_prev: PublicFormState, formData: FormData): Promise<PublicFormState> {
  try {
    const { ip } = await clientInfo();
    limited(`signup:${ip}`, 5, 60);
    const input = signupSchema.parse(Object.fromEntries(formData));
    await signup(input);
    return { ok: true, done: true };
  } catch (err) {
    return formError(err);
  }
}

export async function confirmEmailAction(_prev: PublicFormState, formData: FormData): Promise<PublicFormState> {
  try {
    await confirmEmail(String(formData.get("token") ?? ""));
  } catch (err) {
    return formError(err);
  }
  redirect("/login?verified=1");
}

// ─── Forgot / reset password ─────────────────────────────────

export async function forgotPasswordAction(_prev: PublicFormState, formData: FormData): Promise<PublicFormState> {
  try {
    const { ip } = await clientInfo();
    const { email } = forgotSchema.parse(Object.fromEntries(formData));
    limited(`forgot:${ip}`, 10, 60);
    limited(`forgot:${email}`, 3, 15);
    await requestPasswordReset(email, ip);
    return { ok: true, done: true };
  } catch (err) {
    return formError(err);
  }
}

export async function resetPasswordAction(_prev: PublicFormState, formData: FormData): Promise<PublicFormState> {
  try {
    const { ip, ua } = await clientInfo();
    limited(`reset:${ip}`, 10, 15);
    const input = resetSchema.parse(Object.fromEntries(formData));
    await resetPassword(input.token, input.password, ua, ip);
  } catch (err) {
    return formError(err);
  }
  redirect("/login?reset=1");
}

// ─── Signed in: change own password ──────────────────────────

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const me = await requireUser();
    const { ip, ua } = await clientInfo();
    limited(`change-pw:${me.id}`, 5, 15);
    const input = changePasswordSchema.parse(Object.fromEntries(formData));
    const updated = await changePassword(me.id, input.current, input.password, ua, ip);
    // keep this browser signed in; every other session is signed out by the new fingerprint
    await createSession({ userId: me.id, role: me.role, pv: passwordVersion(updated.passwordHash) });
    return { ok: true, message: "Password changed. Other devices have been signed out." };
  } catch (err) {
    return formError(err);
  }
}
