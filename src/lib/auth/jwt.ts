/**
 * Edge-safe JWT helpers (used by both middleware and server code).
 * Do NOT import server-only modules here.
 */
import { jwtVerify, SignJWT } from "jose";
import { SESSION_TTL_SECONDS, USER_ROLES, type UserRole } from "@/config/constants";

/** pv = short fingerprint of the password hash: changing the password signs out every other session */
export type SessionPayload = { userId: string; role: UserRole; pv: string };

const encoder = new TextEncoder();

export async function signSessionToken(payload: SessionPayload, secret: string): Promise<string> {
  return new SignJWT({ userId: payload.userId, role: payload.role, pv: payload.pv })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(encoder.encode(secret));
}

export async function verifySessionToken(
  token: string | undefined,
  secret: string,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, encoder.encode(secret), { algorithms: ["HS256"] });
    const { userId, role, pv } = payload;
    if (typeof userId !== "string" || typeof role !== "string" || typeof pv !== "string") return null;
    if (!(USER_ROLES as readonly string[]).includes(role)) return null;
    return { userId, role: role as UserRole, pv };
  } catch {
    return null;
  }
}
