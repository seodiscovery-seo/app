/**
 * Quick redirect for signed-out visitors (based on the signed cookie).
 * Real permission checks happen in src/lib/auth/dal.ts on every page and action.
 */
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/config/constants";
import { verifySessionToken } from "@/lib/auth/jwt";

export async function middleware(req: NextRequest) {
  const secret = process.env.AUTH_SECRET;
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = secret ? await verifySessionToken(token, secret) : null;
  const path = req.nextUrl.pathname;
  const isLogin = path === "/login";
  // Pages anyone can open (they check their own tokens)
  const isPublic =
    isLogin || ["/signup", "/verify-email", "/forgot-password", "/reset-password"].includes(path) || path.startsWith("/q/"); // /q/… = client quotation link

  if (!session && !isPublic) {
    const url = new URL("/login", req.url);
    if (path !== "/") url.searchParams.set("from", path);
    return NextResponse.redirect(url);
  }
  // Note: no "signed in → leave /login" redirect here. The cookie can be valid while the account is not
  // (password changed, user deactivated); the login page itself checks the database and redirects.
  return NextResponse.next();
}

export const config = {
  // everything except Next.js internals, static files, the health check and the public APIs (they check their own keys)
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/health|api/v1|api/webhooks|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)"],
};
