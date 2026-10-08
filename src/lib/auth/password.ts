import "server-only";
import { compare, hash } from "bcryptjs";

const ROUNDS = 12;
let dummyHash: Promise<string> | null = null;

export function hashPassword(password: string): Promise<string> {
  return hash(password, ROUNDS);
}

export function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return compare(password, passwordHash);
}

/** Runs a compare anyway when the user doesn't exist, so response time doesn't reveal valid emails. */
export async function burnPasswordCheck(password: string): Promise<void> {
  dummyHash ??= hash("timing-safe-dummy-password", ROUNDS);
  await compare(password, await dummyHash);
}
