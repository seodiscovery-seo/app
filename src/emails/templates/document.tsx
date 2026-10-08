import type { EmailContent } from "../registry";
import { AttachmentList, Button, Heading, Layout, Paragraphs, Text, type Brand, type FileMeta } from "../components";

export type DocumentData = { name: string; title: string; message?: string; actionUrl?: string; buttonText?: string };

/** Quotation, invoice, proposal, report… sent with files attached. */
export default function DocumentEmail({ data, brand, preheader, content, files = [] }: {
  data: DocumentData;
  brand: Brand;
  preheader: string;
  content: EmailContent;
  files?: FileMeta[];
}) {
  return (
    <Layout brand={brand} preheader={preheader} reason={`You received this email because ${brand.name} sent you a document.`}>
      <Heading>{content.heading}</Heading>
      {/* A personal message written for this send replaces the default text */}
      <Paragraphs text={data.message?.trim() ? data.message : content.body} />
      <AttachmentList files={files} />
      {data.actionUrl && <Button href={data.actionUrl} brand={brand}>{data.buttonText || content.button}</Button>}
      {content.note && <Text small muted>{content.note}</Text>}
    </Layout>
  );
}
