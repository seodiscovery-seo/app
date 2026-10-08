/** Plain-language names for template data fields (used in the admin panel instead of raw keys). */
export const FIELD_LABELS: Record<string, { label: string; hint?: string; kind?: "url" | "number" | "long" }> = {
  name: { label: "Customer name" },
  actionUrl: { label: "Button link", kind: "url" },
  verifyUrl: { label: "Confirmation link", kind: "url" },
  resetUrl: { label: "Reset link", kind: "url" },
  secureAccountUrl: { label: "“Secure my account” link", kind: "url" },
  expiresInMinutes: { label: "Link works for (minutes)", kind: "number" },
  code: { label: "Code (optional)" },
  ipAddress: { label: "IP address" },
  changedAt: { label: "Date & time of change" },
  loginAt: { label: "Date & time of sign-in" },
  device: { label: "Device" },
  location: { label: "Location" },
  title: { label: "Title" },
  message: { label: "Personal message", kind: "long" },
  buttonText: { label: "Button text" },
};

export const fieldLabel = (key: string) => FIELD_LABELS[key]?.label ?? key;
