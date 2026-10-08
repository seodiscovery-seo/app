/**
 * The list of emails this app can send. Each template has:
 *  - a zod schema: the data your app must send (checked before anything is rendered)
 *  - sample data: used for previews and test emails
 *  - default subject + preheader (admins can override both)
 *  - linkFields: data fields that contain links (checked against the allow-list, masked in logs)
 * To add an email: create a component in ./templates and add an entry here.
 */
import type { ReactElement } from "react";
import { z } from "zod";
import type { Brand, FileMeta } from "./components";
import DocumentEmail from "./templates/document";
import NewLoginEmail from "./templates/new-login";
import PasswordChangedEmail from "./templates/password-changed";
import PasswordResetEmail from "./templates/password-reset";
import VerifyEmail from "./templates/verify-email";
import WelcomeEmail from "./templates/welcome";

/** https links only (http allowed for localhost while developing). */
export const linkField = z
  .string()
  .trim()
  .url("Must be a full link starting with https://")
  .refine((v) => {
    try {
      const u = new URL(v);
      return u.protocol === "https:" || (u.protocol === "http:" && ["localhost", "127.0.0.1"].includes(u.hostname));
    } catch {
      return false;
    }
  }, "Links must start with https://");

const name = z.string().trim().min(1, "name is required").max(80);
const shortText = z.string().trim().max(120).optional();

type AnySchema = z.ZodObject<z.ZodRawShape>;

/** The words inside an email. Admins can change these in the panel; {{variables}} are filled per email. */
export type EmailContent = { heading: string; body: string; button: string; note: string };
export const CONTENT_LIMITS = { heading: 150, body: 2000, button: 40, note: 600 } as const;

export type TemplateDef<S extends AnySchema = AnySchema> = {
  key: string;
  name: string;
  description: string;
  category: "Account" | "Security" | "Documents";
  schema: S;
  sample: z.input<S>;
  subject: string;
  preheader: string;
  linkFields: string[];
  /** default wording; admins can override it */
  content: EmailContent;
  render: (props: { data: z.output<S>; brand: Brand; preheader: string; content: EmailContent; files?: FileMeta[] }) => ReactElement;
  /** this email can carry file attachments */
  allowsAttachments?: boolean;
};

function define<S extends AnySchema>(def: TemplateDef<S>): TemplateDef<S> {
  return def;
}

export const TEMPLATES = [
  define({
    key: "welcome",
    name: "Welcome",
    description: "Sent right after someone creates an account.",
    category: "Account",
    schema: z.object({ name, actionUrl: linkField }),
    sample: { name: "Priya", actionUrl: "https://app.example.com/dashboard" },
    subject: "Welcome to {{brand}}, {{name}}",
    preheader: "Your account is ready. Here's how to get started.",
    linkFields: ["actionUrl"],
    content: {
      heading: "Welcome to {{brand}}, {{name}}",
      body: "Your account is ready. Everything is set up, so you can sign in and get started right away.",
      button: "Go to your account",
      note: "Need a hand getting started? Just reply to this email.",
    },
    render: (p) => <WelcomeEmail {...p} />,
  }),
  define({
    key: "verify-email",
    name: "Verify email",
    description: "Asks a new user to confirm their email address.",
    category: "Account",
    schema: z.object({
      name,
      verifyUrl: linkField,
      code: z.string().trim().regex(/^[A-Z0-9]{4,8}$/i, "code must be 4–8 letters/numbers").optional(),
      expiresInMinutes: z.coerce.number().int().min(1).max(10080).default(60),
    }),
    sample: { name: "Priya", verifyUrl: "https://app.example.com/verify?token=3f9a7c21e8b4", code: "482913", expiresInMinutes: 60 },
    subject: "Confirm your email for {{brand}}",
    preheader: "One click to confirm your email address.",
    linkFields: ["verifyUrl"],
    content: {
      heading: "Confirm your email address",
      body: "Hi {{name}}, please confirm this is your email address so we can keep your {{brand}} account secure.",
      button: "Confirm email address",
      note: "This link expires in {{expiresInMinutes}} minutes. If you didn't create an account, you can ignore this email.",
    },
    render: (p) => <VerifyEmail {...p} />,
  }),
  define({
    key: "password-reset",
    name: "Password reset",
    description: "Sends a one-time link to choose a new password.",
    category: "Security",
    schema: z.object({
      name,
      resetUrl: linkField,
      expiresInMinutes: z.coerce.number().int().min(1).max(1440).default(30),
      ipAddress: shortText,
    }),
    sample: { name: "Priya", resetUrl: "https://app.example.com/reset?token=8c1d5e0b77aa", expiresInMinutes: 30, ipAddress: "103.21.58.14" },
    subject: "Reset your {{brand}} password",
    preheader: "Use this link to choose a new password. It expires soon.",
    linkFields: ["resetUrl"],
    content: {
      heading: "Reset your password",
      body: "Hi {{name}}, we received a request to reset the password for your {{brand}} account.",
      button: "Choose a new password",
      note: "Didn't ask for this? You can ignore this email. Your password stays the same until you open the link above and choose a new one.",
    },
    render: (p) => <PasswordResetEmail {...p} />,
  }),
  define({
    key: "password-changed",
    name: "Password changed",
    description: "Confirms a password change and helps if it wasn't the user.",
    category: "Security",
    schema: z.object({
      name,
      changedAt: z.string().trim().min(1, "changedAt is required").max(80),
      device: shortText,
      ipAddress: shortText,
      secureAccountUrl: linkField,
    }),
    sample: {
      name: "Priya",
      changedAt: "6 Oct 2026, 4:32 PM IST",
      device: "Chrome on Windows",
      ipAddress: "103.21.58.14",
      secureAccountUrl: "https://app.example.com/security",
    },
    subject: "Your {{brand}} password was changed",
    preheader: "If this wasn't you, secure your account now.",
    linkFields: ["secureAccountUrl"],
    content: {
      heading: "Your password was changed",
      body: "Hi {{name}}, the password for your {{brand}} account was just changed.\n\nIf this was you, there's nothing else to do.",
      button: "Secure my account",
      note: "Wasn't you? Someone may have access to your account. Secure it now: reset your password and sign out of other devices.",
    },
    render: (p) => <PasswordChangedEmail {...p} />,
  }),
  define({
    key: "new-login",
    name: "New login alert",
    description: "Warns the user about a sign-in from a new device.",
    category: "Security",
    schema: z.object({
      name,
      loginAt: z.string().trim().min(1, "loginAt is required").max(80),
      device: z.string().trim().min(1, "device is required").max(120),
      location: shortText,
      ipAddress: shortText,
      secureAccountUrl: linkField,
    }),
    sample: {
      name: "Priya",
      loginAt: "6 Oct 2026, 9:14 AM IST",
      device: "Safari on iPhone",
      location: "Amritsar, Punjab, India",
      ipAddress: "49.36.112.7",
      secureAccountUrl: "https://app.example.com/security",
    },
    subject: "New sign-in to your {{brand}} account",
    preheader: "We noticed a sign-in from a new device.",
    linkFields: ["secureAccountUrl"],
    content: {
      heading: "New sign-in to your account",
      body: "Hi {{name}}, your {{brand}} account was just signed in to from a device we haven't seen before.\n\nIf this was you, you can ignore this email.",
      button: "Secure my account",
      note: "Don't recognise this sign-in? Change your password straight away so nobody else can use your account.",
    },
    render: (p) => <NewLoginEmail {...p} />,
  }),
  define({
    key: "document",
    name: "Document",
    description: "Sends a quotation, invoice, proposal or report with files attached.",
    category: "Documents",
    schema: z.object({
      name,
      title: z.string().trim().min(2, "title is required, e.g. Quotation for SEO services").max(120),
      message: z.string().trim().max(5000).optional(),
      actionUrl: linkField.optional(),
      buttonText: z.string().trim().max(40).optional(),
    }),
    sample: {
      name: "Priya",
      title: "Quotation for SEO services",
      message: "Hi Priya,\n\nThank you for your time on the call today. Your quotation for 6 months of SEO is attached.\n\nIt covers the audit, on-page fixes, content and monthly reporting. Reply to this email if you'd like any changes.",
    },
    subject: "{{title}} from {{brand}}",
    preheader: "Your {{title}} is attached.",
    linkFields: ["actionUrl"],
    allowsAttachments: true,
    content: {
      heading: "{{title}}",
      body: "Hi {{name}},\n\nPlease find your {{title}} attached to this email. Let us know if you have any questions.",
      button: "View online",
      note: "Simply reply to this email if you have any questions.",
    },
    render: (p) => <DocumentEmail {...p} />,
  }),
] as const;

export type TemplateKey = (typeof TEMPLATES)[number]["key"];
export const TEMPLATE_KEYS = TEMPLATES.map((t) => t.key) as [TemplateKey, ...TemplateKey[]];

export function getTemplateDef(key: string): TemplateDef | undefined {
  return (TEMPLATES as unknown as readonly TemplateDef[]).find((t) => t.key === key);
}

/** Fills {{variables}} but keeps line breaks (for the email body). */
export function fillContent(text: string, data: Record<string, unknown>, brandName: string): string {
  return text
    .replace(/\{\{\s*([a-zA-Z_]+)\s*\}\}/g, (_, k: string) => {
      if (k === "brand") return brandName;
      const v = data[k];
      return typeof v === "string" || typeof v === "number" ? String(v) : "";
    })
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/** Replaces {{brand}} and {{field}} in subject/preheader. Unknown tokens are removed. */
export function fillText(text: string, data: Record<string, unknown>, brandName: string): string {
  return text
    .replace(/\{\{\s*([a-zA-Z_]+)\s*\}\}/g, (_, k: string) => {
      if (k === "brand") return brandName;
      const v = data[k];
      return typeof v === "string" || typeof v === "number" ? String(v) : "";
    })
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** All templates as the general type (for lists in the admin panel). */
export const ALL_TEMPLATES = TEMPLATES as unknown as readonly TemplateDef[];
