import type { Metadata } from "next";
import { requireUserPage } from "@/lib/auth/dal";
import { PageHeader } from "@/components/page-header";
import { getAllSettings } from "@/server/services/settings.service";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireUserPage(["ADMIN"]);
  const settings = await getAllSettings();
  return (
    <>
      <PageHeader title="Settings" description="Your brand appears in every email. Changes apply to the next email sent." />
      <SettingsForm settings={settings} />
    </>
  );
}
