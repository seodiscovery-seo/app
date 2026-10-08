import type { ReactNode } from "react";
import { ROLE_LABELS } from "@/config/constants";
import { navForRole } from "@/config/navigation";
import { requireUserPage } from "@/lib/auth/dal";
import { isLiveMode } from "@/lib/env";
import { AppShell } from "@/components/app-shell";
import { getAllSettings } from "@/server/services/settings.service";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireUserPage();
  const s = await getAllSettings();
  return (
    <AppShell
      items={navForRole(user.role)}
      user={{ name: user.name, email: user.email, roleLabel: ROLE_LABELS[user.role] }}
      brandName={s["brand.name"]}
      logoUrl={s["brand.logoUrl"]}
      live={isLiveMode()}
    >
      {children}
    </AppShell>
  );
}
