export const APP_NAME = "Email App";

// ─── Roles ───────────────────────────────────────────────────
export const USER_ROLES = ["ADMIN", "VIEWER"] as const;
export type UserRole = (typeof USER_ROLES)[number];
export const ROLE_LABELS: Record<UserRole, string> = { ADMIN: "Admin", VIEWER: "Viewer" };

// ─── Email statuses ──────────────────────────────────────────
export const EMAIL_STATUSES = [
  "QUEUED",
  "SENT",
  "DELIVERED",
  "DELAYED",
  "BOUNCED",
  "COMPLAINED",
  "FAILED",
  "SUPPRESSED",
  "TEST",
] as const;
export type EmailStatus = (typeof EMAIL_STATUSES)[number];

export const STATUS_LABELS: Record<EmailStatus, string> = {
  QUEUED: "Queued",
  SENT: "Sent",
  DELIVERED: "Delivered",
  DELAYED: "Delayed",
  BOUNCED: "Bounced",
  COMPLAINED: "Spam complaint",
  FAILED: "Failed",
  SUPPRESSED: "Blocked",
  TEST: "Test mode",
};

export const STATUS_STYLES: Record<EmailStatus, string> = {
  QUEUED: "bg-slate-100 text-slate-700",
  SENT: "bg-sky-50 text-sky-700",
  DELIVERED: "bg-emerald-50 text-emerald-700",
  DELAYED: "bg-amber-50 text-amber-800",
  BOUNCED: "bg-rose-50 text-rose-700",
  COMPLAINED: "bg-rose-50 text-rose-700",
  FAILED: "bg-rose-100 text-rose-800",
  SUPPRESSED: "bg-zinc-100 text-zinc-700",
  TEST: "bg-violet-50 text-violet-700",
};

export const SUPPRESSION_REASONS = ["BOUNCE", "COMPLAINT", "MANUAL"] as const;
export type SuppressionReason = (typeof SUPPRESSION_REASONS)[number];
export const SUPPRESSION_LABELS: Record<SuppressionReason, string> = {
  BOUNCE: "Bounced",
  COMPLAINT: "Marked as spam",
  MANUAL: "Added by admin",
};

// ─── Auth / misc ─────────────────────────────────────────────
export const SESSION_COOKIE_NAME = "mail_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
export const LOGIN_RATE_LIMIT = { max: 5, windowMs: 15 * 60 * 1000 } as const;
export const PAGINATION = { defaultPageSize: 25, maxPageSize: 200 } as const;
export const MIN_PASSWORD_LENGTH = 8;
/** API: max sends per key per minute */
export const API_RATE_LIMIT = { max: 120, windowMs: 60 * 1000 } as const;
