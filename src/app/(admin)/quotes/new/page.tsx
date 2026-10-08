import type { Metadata } from "next";
import Link from "next/link";
import { requireUserPage } from "@/lib/auth/dal";
import { toDateInput } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { getAllSettings } from "@/server/services/settings.service";
import { QuoteEditor } from "../quote-editor";

export const metadata: Metadata = { title: "New quotation" };

export default async function NewQuotePage() {
  await requireUserPage(["ADMIN"]);
  const s = await getAllSettings();
  const valid = new Date();
  valid.setDate(valid.getDate() + s["quotes.validDays"]);
  return (
    <>
      <Link href="/quotes" className="text-sm font-medium text-muted hover:text-ink">← All quotations</Link>
      <div className="mt-2"><PageHeader title="New quotation" description="Fill in the four steps. The number and the PDF are created for you." /></div>
      <QuoteEditor
        taxLabel={s["quotes.taxLabel"]}
        locked={false}
        initial={{
          clientName: "",
          clientEmail: "",
          clientCompany: "",
          title: "",
          items: [],
          currency: s["quotes.currency"],
          taxPercent: s["quotes.taxPercent"],
          discount: 0,
          validUntil: toDateInput(valid),
          notes: "",
          terms: s["quotes.terms"],
        }}
      />
    </>
  );
}
