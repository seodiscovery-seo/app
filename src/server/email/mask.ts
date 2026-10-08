/**
 * Logs must never contain working login/reset links or codes.
 * Links keep only their address (https://app.example.com/reset), query strings and long path parts are hidden.
 */
const SECRET_KEYS = /token|code|otp|secret|password|key/i;

export function maskUrl(value: string): string {
  try {
    const u = new URL(value);
    const path = u.pathname
      .split("/")
      .map((part) => (part.length >= 16 || /[0-9a-f]{12,}/i.test(part) ? "•••" : part))
      .join("/");
    return `${u.origin}${path}${u.search || u.hash ? "?•••" : ""}`;
  } catch {
    return "•••";
  }
}

export function maskData(data: Record<string, unknown>, linkFields: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (typeof v === "string" && linkFields.includes(k)) out[k] = maskUrl(v);
    else if (SECRET_KEYS.test(k) && v !== undefined && v !== null && v !== "") out[k] = "••••••";
    else out[k] = v;
  }
  return out;
}
