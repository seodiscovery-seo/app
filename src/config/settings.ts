/**
 * Settings registry. Each setting has a schema + default. (Pure module: safe for the seed script.)
 */
import { z } from "zod";

const hex = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Use a colour like #1d4ed8");
const optionalEmail = z.union([z.string().trim().email(), z.literal("")]);
const optionalUrl = z.union([z.string().trim().url(), z.literal("")]);

export const settingsSchemas = {
  "brand.name": z.string().trim().min(1).max(80),
  "brand.logoUrl": optionalUrl,
  "brand.primaryColor": hex,
  "brand.appUrl": optionalUrl,
  "brand.supportEmail": optionalEmail,
  "brand.address": z.string().trim().max(200),
  /** "Acme <no-reply@mail.acme.com>" parts */
  "sending.fromName": z.string().trim().min(1).max(80),
  "sending.fromEmail": optionalEmail,
  "sending.replyTo": optionalEmail,
  /** links inside emails must point to one of these hosts (empty = any https link) */
  "sending.allowedLinkHosts": z.array(z.string().trim().toLowerCase().min(1).max(200)).max(50),
  "logs.retentionDays": z.number().int().min(7).max(3650),
  /** people can create their own account at /signup */
  "auth.allowSignup": z.boolean(),
  /** only emails ending with this domain may sign up (empty = any) */
  "auth.signupDomain": z.union([z.string().trim().toLowerCase().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/, "Use a domain like seodiscovery.com"), z.literal("")]),
  /** email users when they sign in from a new device */
  "auth.loginAlerts": z.boolean(),
  /** quotations */
  "quotes.prefix": z.string().trim().toUpperCase().regex(/^[A-Z0-9]{1,6}$/, "Use 1-6 letters/numbers, e.g. QT"),
  "quotes.currency": z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Use a 3-letter code like INR"),
  "quotes.taxPercent": z.number().min(0).max(100),
  "quotes.taxLabel": z.string().trim().min(1).max(20),
  "quotes.validDays": z.number().int().min(1).max(365),
  "quotes.terms": z.string().trim().max(3000),
  "quotes.taxId": z.string().trim().max(40),
} as const;

export type SettingKey = keyof typeof settingsSchemas;
export type SettingValue<K extends SettingKey> = z.infer<(typeof settingsSchemas)[K]>;
export type SettingsMap = { [K in SettingKey]: SettingValue<K> };

export const settingDefaults: SettingsMap = {
  "brand.name": "My App",
  "brand.logoUrl": "",
  "brand.primaryColor": "#2347d6",
  "brand.appUrl": "",
  "brand.supportEmail": "",
  "brand.address": "",
  "sending.fromName": "My App",
  "sending.fromEmail": "",
  "sending.replyTo": "",
  "sending.allowedLinkHosts": [],
  "logs.retentionDays": 90,
  "auth.allowSignup": false,
  "auth.signupDomain": "",
  "auth.loginAlerts": true,
  "quotes.prefix": "QT",
  "quotes.currency": "INR",
  "quotes.taxPercent": 18,
  "quotes.taxLabel": "GST",
  "quotes.validDays": 15,
  "quotes.terms": "50% advance to start, balance on completion.\nPrices are valid until the date shown above.\nWork starts within 3 working days of acceptance.",
  "quotes.taxId": "",
};

export const SETTING_KEYS = Object.keys(settingsSchemas) as [SettingKey, ...SettingKey[]];
