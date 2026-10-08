/**
 * API keys for POST /api/v1/send. Only a SHA-256 hash is stored; the full key is shown once.
 */
import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";

const hashKey = (key: string) => createHash("sha256").update(key).digest("hex");

export async function createApiKey(name: string) {
  const key = `ek_${randomBytes(24).toString("base64url")}`;
  const row = await db.apiKey.create({ data: { name, prefix: key.slice(0, 10), hash: hashKey(key) } });
  return { id: row.id, key };
}

export function listApiKeys() {
  return db.apiKey.findMany({ orderBy: [{ revokedAt: "asc" }, { createdAt: "desc" }] });
}

export async function revokeApiKey(id: string) {
  await db.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
}

/** Returns the key row when valid and not revoked. */
export async function verifyApiKey(key: string | null | undefined) {
  if (!key || !key.startsWith("ek_")) return null;
  const row = await db.apiKey.findUnique({ where: { hash: hashKey(key) } });
  if (!row || row.revokedAt) return null;
  // don't write on every request
  if (!row.lastUsedAt || Date.now() - row.lastUsedAt.getTime() > 60_000) {
    await db.apiKey.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } });
  }
  return row;
}
