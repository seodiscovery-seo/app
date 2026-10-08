import "server-only";
import { createHash } from "node:crypto";

/** Short fingerprint of a password hash, stored in the session. A new password = a new fingerprint. */
export function passwordVersion(passwordHash: string): string {
  return createHash("sha256").update(passwordHash).digest("base64url").slice(0, 16);
}
