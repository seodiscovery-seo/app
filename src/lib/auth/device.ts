import { createHash } from "node:crypto";

/** "Chrome on Windows" from a User-Agent string (good enough for a security email). */
export function describeDevice(ua: string | null | undefined): string {
  const s = ua ?? "";
  const browser = /Edg\//.test(s) ? "Edge" : /OPR\/|Opera/.test(s) ? "Opera" : /Firefox\//.test(s) ? "Firefox" : /Chrome\//.test(s) ? "Chrome" : /Safari\//.test(s) ? "Safari" : "A browser";
  const os = /iPhone/.test(s) ? "iPhone" : /iPad/.test(s) ? "iPad" : /Android/.test(s) ? "Android" : /Windows/.test(s) ? "Windows" : /Mac OS X|Macintosh/.test(s) ? "Mac" : /Linux/.test(s) ? "Linux" : "an unknown device";
  return `${browser} on ${os}`;
}

export function deviceFingerprint(ua: string | null | undefined): string {
  // browser + OS only, so normal browser updates don't count as a "new device"
  return createHash("sha256").update(describeDevice(ua)).digest("hex").slice(0, 16);
}

export function formatWhen(d = new Date()): string {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(d);
}
