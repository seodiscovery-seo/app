import type { EmailContent } from "../registry";
import { Button, Code, Heading, Layout, LinkFallback, Paragraphs, Text, type Brand } from "../components";

export type VerifyEmailData = { name: string; verifyUrl: string; code?: string; expiresInMinutes: number };

export default function VerifyEmail({ data, brand, preheader, content }: { data: VerifyEmailData; brand: Brand; preheader: string; content: EmailContent }) {
  return (
    <Layout brand={brand} preheader={preheader}>
      <Heading>{content.heading}</Heading>
      <Paragraphs text={content.body} />
      <Button href={data.verifyUrl} brand={brand}>{content.button}</Button>
      {data.code && (
        <>
          <Text small>Or enter this code in the app:</Text>
          <Code code={data.code} />
        </>
      )}
      {content.note && <Text small muted>{content.note}</Text>}
      <LinkFallback href={data.verifyUrl} />
    </Layout>
  );
}
