import { getCurrentUser } from "@/lib/auth/dal";
import { quotePdf } from "@/server/quotes/quote.service";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentUser())) return new Response("Please sign in.", { status: 401 });
  const { id } = await params;
  try {
    const { number, bytes } = await quotePdf(id);
    return new Response(Buffer.from(bytes), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${number}.pdf"`, "Cache-Control": "no-store" },
    });
  } catch {
    return new Response("Quotation not found.", { status: 404 });
  }
}
