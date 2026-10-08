import type { Metadata } from "next";
import { requireUserPage } from "@/lib/auth/dal";
import { isLiveMode } from "@/lib/env";
import { PageHeader } from "@/components/page-header";
import { ACCEPT_ATTRIBUTE, ATTACHMENT_LIMITS } from "@/server/email/attachments";
import { SendDocumentForm } from "./send-form";

export const metadata: Metadata = { title: "Send a document" };

export default async function SendDocumentPage() {
  await requireUserPage(["ADMIN"]);
  return (
    <>
      <PageHeader
        title="Send a document"
        description="Send a quotation, invoice, proposal or report to one person, with the files attached and your branding."
      />
      <SendDocumentForm accept={ACCEPT_ATTRIBUTE} limits={ATTACHMENT_LIMITS} live={isLiveMode()} />
      <p className="mt-6 max-w-3xl text-xs text-muted">
        For one-to-one documents people expect from you. Don&apos;t use this for newsletters or cold mass emails: that can push your password and sign-up emails into spam.
      </p>
    </>
  );
}
