/**
 * Self-service accounts: sign up → verify email → sign in; forgot / reset / change password; new-device alerts.
 * Every email goes through this app's own sendEmail() and templates.
 * Answers never reveal whether an email address has an account.
 */
import "server-only";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { describeDevice, deviceFingerprint, formatWhen } from "@/lib/auth/device";
import { clearPending, consumeToken, createToken, deleteUserTokens, isPending, markPending, peekToken, rememberDevice } from "@/lib/auth/tokens";
import { db } from "@/lib/db";
import { env, isLiveMode } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/server/email/send";
import { getAllSettings } from "@/server/services/settings.service";

const VERIFY_MINUTES = 60;
const RESET_MINUTES = 30;

/** In test mode nothing is delivered, so print the link where the person running the app can see it. */
function showLinkInTestMode(what: string, email: string, link: string) {
  if (!isLiveMode()) {
    console.log(`\n  ✉  [Test mode] ${what} for ${email}\n     ${link}\n`);
  }
}

async function sendVerification(user: { id: string; name: string; email: string }) {
  const token = await createToken("verify", user.id, VERIFY_MINUTES);
  const verifyUrl = `${env.APP_URL}/verify-email?token=${token}`;
  showLinkInTestMode("Verify-email link", user.email, verifyUrl);
  const r = await sendEmail({ template: "verify-email", to: user.email, data: { name: user.name, verifyUrl, expiresInMinutes: VERIFY_MINUTES }, source: "system" });
  if (!r.ok) logger.warn("Verification email not sent", { error: r.error });
}

// ─── Sign up ─────────────────────────────────────────────────

export async function signup(input: { name: string; email: string; password: string }) {
  const settings = await getAllSettings();
  if (!settings["auth.allowSignup"]) throw new AppError("FORBIDDEN", "Sign-ups are closed. Ask an admin to add you.");
  const email = input.email.toLowerCase();
  const domain = settings["auth.signupDomain"];
  if (domain && !email.endsWith(`@${domain}`)) {
    throw new AppError("VALIDATION", `Only @${domain} email addresses can create an account here.`);
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    // Don't reveal that the address exists. If it's still waiting for verification, send the link again.
    if (await isPending(existing.id)) await sendVerification(existing);
    return;
  }
  const user = await db.user.create({
    data: { name: input.name, email, passwordHash: await hashPassword(input.password), role: "VIEWER", isActive: false },
  });
  await markPending(user.id);
  await sendVerification(user);
  logger.info("Account created, waiting for email verification", { userId: user.id });
}

/** Step 1 (page load): is this verify link still good? */
export async function checkVerifyToken(token: string | undefined) {
  const userId = await peekToken("verify", token);
  if (!userId) return null;
  return db.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
}

/** Step 2 (button press): activate the account. A button (not just opening the link) stops email scanners from using it. */
export async function confirmEmail(token: string) {
  const userId = await consumeToken("verify", token);
  if (!userId || !(await isPending(userId))) throw new AppError("VALIDATION", "This link has expired or was already used.");
  const user = await db.user.update({ where: { id: userId }, data: { isActive: true } });
  await clearPending(userId);
  await sendEmail({ template: "welcome", to: user.email, data: { name: user.name, actionUrl: `${env.APP_URL}/dashboard` }, source: "system" });
  logger.info("Email verified, account active", { userId });
}

// ─── Forgot / reset password ─────────────────────────────────

export async function requestPasswordReset(email: string, ip: string) {
  const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !user.isActive) return; // same answer either way
  const token = await createToken("reset", user.id, RESET_MINUTES);
  const resetUrl = `${env.APP_URL}/reset-password?token=${token}`;
  showLinkInTestMode("Password-reset link", user.email, resetUrl);
  const r = await sendEmail({
    template: "password-reset",
    to: user.email,
    data: { name: user.name, resetUrl, expiresInMinutes: RESET_MINUTES, ...(ip !== "local" ? { ipAddress: ip } : {}) },
    source: "system",
  });
  if (!r.ok) logger.warn("Password-reset email not sent", { error: r.error });
}

export async function checkResetToken(token: string | undefined) {
  const userId = await peekToken("reset", token);
  if (!userId) return null;
  return db.user.findUnique({ where: { id: userId }, select: { name: true, email: true, isActive: true } });
}

async function passwordChangedEmail(user: { name: string; email: string }, ua: string | null, ip: string) {
  await sendEmail({
    template: "password-changed",
    to: user.email,
    data: {
      name: user.name,
      changedAt: formatWhen(),
      device: describeDevice(ua),
      ...(ip !== "local" ? { ipAddress: ip } : {}),
      secureAccountUrl: `${env.APP_URL}/forgot-password`,
    },
    source: "system",
  });
}

export async function resetPassword(token: string, newPassword: string, ua: string | null, ip: string) {
  const userId = await consumeToken("reset", token);
  if (!userId) throw new AppError("VALIDATION", "This link has expired or was already used. Ask for a new one.");
  const user = await db.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(newPassword) } });
  await deleteUserTokens(userId, "reset");
  await passwordChangedEmail(user, ua, ip);
  logger.info("Password reset", { userId });
}

/** Signed-in user changes their own password. Returns the new hash so the session can be renewed. */
export async function changePassword(userId: string, current: string, next: string, ua: string | null, ip: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await verifyPassword(current, user.passwordHash))) {
    throw new AppError("VALIDATION", "Your current password is not correct.");
  }
  if (await verifyPassword(next, user.passwordHash)) throw new AppError("VALIDATION", "Choose a password you haven't used here before.");
  const updated = await db.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(next) } });
  await passwordChangedEmail(updated, ua, ip);
  return updated;
}

// ─── After a successful sign-in ──────────────────────────────

export async function afterSignIn(userId: string, ua: string | null, ip: string) {
  try {
    const [user, settings] = await Promise.all([db.user.findUnique({ where: { id: userId } }), getAllSettings()]);
    if (!user) return;
    const { isNew, isFirst } = await rememberDevice(userId, deviceFingerprint(ua));
    if (!isNew || isFirst || !settings["auth.loginAlerts"]) return;
    await sendEmail({
      template: "new-login",
      to: user.email,
      data: {
        name: user.name,
        loginAt: formatWhen(),
        device: describeDevice(ua),
        ...(ip !== "local" ? { ipAddress: ip } : {}),
        secureAccountUrl: `${env.APP_URL}/forgot-password`,
      },
      source: "system",
    });
  } catch (err) {
    logger.error("Sign-in alert failed", { error: err });
  }
}
