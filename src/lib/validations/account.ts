import { z } from "zod";
import { MIN_PASSWORD_LENGTH } from "@/config/constants";
import { emailSchema } from "@/lib/validations/common";

const password = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`)
  .max(200)
  .refine((p) => /[a-zA-Z]/.test(p) && /[0-9]/.test(p), "Use letters and at least one number");

const withConfirm = <T extends z.ZodRawShape>(shape: T) =>
  z
    .object({ ...shape, password, confirm: z.string() })
    .refine((v) => v.password === v.confirm, { message: "The two passwords don't match", path: ["confirm"] });

export const signupSchema = withConfirm({ name: z.string().trim().min(2, "Enter your name").max(80), email: emailSchema });
export const forgotSchema = z.object({ email: emailSchema });
export const resetSchema = withConfirm({ token: z.string().min(10).max(200) });
export const changePasswordSchema = withConfirm({ current: z.string().min(1, "Enter your current password").max(200) });
