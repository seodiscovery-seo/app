import type { EmailContent } from "../registry";
import { Button, Heading, InfoBox, Layout, Paragraphs, SecurityNotice, type Brand } from "../components";

export type PasswordChangedData = { name: string; changedAt: string; device?: string; ipAddress?: string; secureAccountUrl: string };

export default function PasswordChangedEmail({ data, brand, preheader, content }: { data: PasswordChangedData; brand: Brand; preheader: string; content: EmailContent }) {
  return (
    <Layout brand={brand} preheader={preheader}>
      <Heading>{content.heading}</Heading>
      <Paragraphs text={content.body} />
      <InfoBox
        rows={[
          ["When", data.changedAt],
          ["Device", data.device],
          ["IP address", data.ipAddress],
        ]}
      />
      {content.note && <SecurityNotice>{content.note}</SecurityNotice>}
      <Button href={data.secureAccountUrl} brand={brand}>{content.button}</Button>
    </Layout>
  );
}
