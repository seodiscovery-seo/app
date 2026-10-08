import type { EmailContent } from "../registry";
import { Button, Heading, Layout, LinkFallback, Paragraphs, SecurityNotice, Text, type Brand } from "../components";

export type PasswordResetData = { name: string; resetUrl: string; expiresInMinutes: number; ipAddress?: string };

export default function PasswordResetEmail({ data, brand, preheader, content }: { data: PasswordResetData; brand: Brand; preheader: string; content: EmailContent }) {
  return (
    <Layout brand={brand} preheader={preheader}>
      <Heading>{content.heading}</Heading>
      <Paragraphs text={content.body} />
      <Button href={data.resetUrl} brand={brand}>{content.button}</Button>
      <Text small muted>
        This link works once and expires in {data.expiresInMinutes} minutes.
        {data.ipAddress ? ` The request came from IP address ${data.ipAddress}.` : ""}
      </Text>
      {content.note && <SecurityNotice>{content.note}</SecurityNotice>}
      <LinkFallback href={data.resetUrl} />
    </Layout>
  );
}
