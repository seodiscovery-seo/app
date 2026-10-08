/** Shows the saved HTML of a test-mode email. */
import { getCurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentUser())) return new Response("Please sign in.", { status: 401 });
  const { id } = await params;
  const log = await db.emailLog.findUnique({ where: { id }, select: { html: true } });
  if (!log?.html) return new Response("No saved copy for this email.", { status: 404 });
  return new Response(log.html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
