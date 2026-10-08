import type { EmailContent } from "../registry";
import { Button, Heading, Layout, Paragraphs, Text, type Brand } from "../components";

export type WelcomeData = { name: string; actionUrl: string };

export default function WelcomeEmail({ data, brand, preheader, content }: { data: WelcomeData; brand: Brand; preheader: string; content: EmailContent }) {
  return (
    <Layout brand={brand} preheader={preheader}>
      <Heading>{content.heading}</Heading>
      <Paragraphs text={content.body} />
      <Button href={data.actionUrl} brand={brand}>{content.button}</Button>
      {content.note && <Text small muted>{content.note}</Text>}
    </Layout>
  );
}
