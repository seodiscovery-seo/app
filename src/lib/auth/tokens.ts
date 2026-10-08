/**
 * One-time tokens for "verify email" and "reset password" links, plus small per-user markers.
 * Stored hashed in the settings table (no extra database tables needed).
 */
import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";

export type TokenType = "verify" | "reset";
type Stored = { type: TokenType; userId: string; expiresAt: number };

const PREFIX = "auth-token:";
const hash = (t: string) => createHash("sha256").update(t).digest("hex");

async function cleanupExpired() {
  const rows = await db.setting.findMany({ where: { key: { startsWith: PREFIX } }, select: { key: true, value: true } });
  const dead = rows.filter((r) => {
    try {
      return (JSON.parse(r.value) as Stored).expiresAt < Date.now();
    } catch {
      return true;
    }
  });
  if (dead.length) await db.setting.deleteMany({ where: { key: { in: dead.map((d) => d.key) } } });
}

/** Creates a new token (and removes older ones of the same type for that user). Returns the raw token for the link. */
export async function createToken(type: TokenType, userId: string, minutes: number): Promise<string> {
  await cleanupExpired();
  await deleteUserTokens(userId, type);
  const token = randomBytes(32).toString("base64url");
  const value: Stored = { type, userId, expiresAt: Date.now() + minutes * 60_000 };
  await db.setting.create({ data: { key: PREFIX + hash(token), value: JSON.stringify(value) } });
  return token;
}

/** Checks a token without using it up (for showing the "choose a new password" form). */
export async function peekToken(type: TokenType, token: string | undefined | null): Promise<string | null> {
  if (!token || token.length > 200) return null;
  const row = await db.setting.findUnique({ where: { key: PREFIX + hash(token) } });
  if (!row) return null;
  try {
    const s = JSON.parse(row.value) as Stored;
    return s.type === type && s.expiresAt > Date.now() ? s.userId : null;
  } catch {
    return null;
  }
}

/** Uses up a token: works once. */
export async function consumeToken(type: TokenType, token: string | undefined | null): Promise<string | null> {
  const userId = await peekToken(type, token);
  if (!userId || !token) return null;
  const { count } = await db.setting.deleteMany({ where: { key: PREFIX + hash(token) } });
  return count === 1 ? userId : null; // two clicks at the same moment: only one wins
}

export async function deleteUserTokens(userId: string, type?: TokenType) {
  const rows = await db.setting.findMany({ where: { key: { startsWith: PREFIX } }, select: { key: true, value: true } });
  const mine = rows.filter((r) => {
    try {
      const s = JSON.parse(r.value) as Stored;
      return s.userId === userId && (!type || s.type === type);
    } catch {
      return false;
    }
  });
  if (mine.length) await db.setting.deleteMany({ where: { key: { in: mine.map((m) => m.key) } } });
}

// ─── Small per-user markers ──────────────────────────────────

/** Set while a self-signed-up account waits for email verification. */
const pendingKey = (userId: string) => `signup-pending:${userId}`;
export const markPending = (userId: string) =>
  db.setting.upsert({ where: { key: pendingKey(userId) }, update: { value: "1" }, create: { key: pendingKey(userId), value: "1" } });
export const isPending = async (userId: string) => !!(await db.setting.findUnique({ where: { key: pendingKey(userId) } }));
export const clearPending = (userId: string) => db.setting.deleteMany({ where: { key: pendingKey(userId) } });
export async function pendingUserIds(): Promise<Set<string>> {
  const rows = await db.setting.findMany({ where: { key: { startsWith: "signup-pending:" } }, select: { key: true } });
  return new Set(rows.map((r) => r.key.slice("signup-pending:".length)));
}

/** Devices a user has signed in from (hashed), for "new sign-in" alerts. */
const devicesKey = (userId: string) => `known-devices:${userId}`;
export async function rememberDevice(userId: string, fingerprint: string): Promise<{ isNew: boolean; isFirst: boolean }> {
  const row = await db.setting.findUnique({ where: { key: devicesKey(userId) } });
  let list: string[] = [];
  try {
    list = row ? (JSON.parse(row.value) as string[]) : [];
  } catch {
    list = [];
  }
  if (list.includes(fingerprint)) return { isNew: false, isFirst: false };
  const next = [fingerprint, ...list].slice(0, 15);
  await db.setting.upsert({ where: { key: devicesKey(userId) }, update: { value: JSON.stringify(next) }, create: { key: devicesKey(userId), value: JSON.stringify(next) } });
  return { isNew: true, isFirst: list.length === 0 };
}
