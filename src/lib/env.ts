/**
 * Validated environment variables.
 * Only DATABASE_URL and AUTH_SECRET are required. Without RESEND_API_KEY the app runs in Test mode:
 * emails are rendered and saved so you can view them, but nothing is delivered.
 */
import "server-only";
import { z } from "zod";

const optional = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() ? v.trim() : undefined));

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters. Run `npm run setup` to generate one."),
  RESEND_API_KEY: optional,
  RESEND_WEBHOOK_SECRET: optional,
  /** Force test mode even when a key is present: EMAIL_MODE="test" */
  EMAIL_MODE: z.enum(["auto", "test"]).optional().default("auto"),
  /** Public address of this admin panel, used in password-reset and verification links */
  APP_URL: z
    .string()
    .url("APP_URL must be a full address like https://emails.yourdomain.com")
    .optional()
    .default("http://localhost:3000")
    .transform((v) => v.replace(/\/+$/, "")),
  /** Only change for testing against a mock server */
  RESEND_API_URL: z.string().url().optional().default("https://api.resend.com"),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `  • ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid .env settings:\n${details}\nTip: run "npm run setup" to create a working .env file.`);
  }
  return parsed.data;
}

export const env = loadEnv();

export const isLiveMode = () => !!env.RESEND_API_KEY && env.EMAIL_MODE !== "test";
