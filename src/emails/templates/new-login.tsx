import type { EmailContent } from "../registry";
import { Button, Heading, InfoBox, Layout, Paragraphs, SecurityNotice, type Brand } from "../components";

export type NewLoginData = {
  name: string;
  loginAt: string;
  device: string;
  location?: string;
  ipAddress?: string;
  secureAccountUrl: string;
};

export default function NewLoginEmail({ data, brand, preheader, content }: { data: NewLoginData; brand: Brand; preheader: string; content: EmailContent }) {
  return (
    <Layout brand={brand} preheader={preheader}>
      <Heading>{content.heading}</Heading>
      <Paragraphs text={content.body} />
      <InfoBox
        rows={[
          ["When", data.loginAt],
          ["Device", data.device],
          ["Location", data.location],
          ["IP address", data.ipAddress],
        ]}
      />
      {content.note && <SecurityNotice>{content.note}</SecurityNotice>}
      <Button href={data.secureAccountUrl} brand={brand}>{content.button}</Button>
    </Layout>
  );
}
