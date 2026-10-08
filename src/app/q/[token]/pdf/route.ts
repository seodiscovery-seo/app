/** Public PDF download for the client (needs the secret link). */
import { quotePdfByToken } from "@/server/quotes/quote.service";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const pdf = await quotePdfByToken(token).catch(() => null);
  if (!pdf) return new Response("This link is not valid.", { status: 404 });
  return new Response(Buffer.from(pdf.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${pdf.number}.pdf"`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
