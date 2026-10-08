import type { UserRole } from "@/config/constants";

export type NavItem = { href: string; label: string; icon: string; group: "Sending" | "Sales" | "Protection" | "Setup"; roles?: UserRole[] };

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Overview", group: "Sending", icon: "M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z" },
  { href: "/quotes", label: "Quotations", group: "Sales", roles: ["ADMIN"], icon: "M9 2h6l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h3Zm5 0v5h5M8 13h8M8 17h5" },
  { href: "/send", label: "Send a document", group: "Sales", roles: ["ADMIN"], icon: "M21.4 11.6 12.7 20.3a5 5 0 0 1-7.1-7.1l8.6-8.6a3.3 3.3 0 0 1 4.7 4.7l-8.6 8.6a1.7 1.7 0 0 1-2.4-2.4l8-8" },
  { href: "/templates", label: "Emails", group: "Sending", icon: "M4 5h16v14H4V5Zm0 1 8 6 8-6" },
  { href: "/logs", label: "Logs", group: "Sending", icon: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" },
  { href: "/suppressions", label: "Block list", group: "Protection", icon: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM5.6 5.6l12.8 12.8" },
  { href: "/api-keys", label: "API & setup", group: "Setup", icon: "M15 7a4 4 0 1 1-3.9 5H8v3H5v-3H3V9h8.1A4 4 0 0 1 15 7Z" },
  { href: "/settings", label: "Settings", group: "Setup", roles: ["ADMIN"], icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14.5 3h-4l-.4 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z" },
  { href: "/users", label: "Users", group: "Setup", roles: ["ADMIN"], icon: "M17 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M10 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm11 10v-2a4 4 0 0 0-3-3.9M16 2.1a4 4 0 0 1 0 7.8" },
];

export const navForRole = (role: UserRole) => NAV_ITEMS.filter((i) => !i.roles || i.roles.includes(role));
