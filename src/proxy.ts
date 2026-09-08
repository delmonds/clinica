import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

const PROTECTED_API_PATTERNS: RegExp[] = [
  /^\/api\/queues$/, // POST cria fila
  /^\/api\/queues\/[^/]+\/call-next$/,
  /^\/api\/tickets$/, // POST emite senha (GET de consulta continua público)
  /^\/api\/tickets\/[^/]+\/(start|finish|no-show|cancel)$/,
];

function isProtectedApiRoute(pathname: string, method: string): boolean {
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return false;
  return PROTECTED_API_PATTERNS.some((pattern) => pattern.test(pathname));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname.startsWith("/recepcao")) {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  if (isProtectedApiRoute(pathname, request.method) && !session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/recepcao/:path*", "/api/queues", "/api/queues/:path*", "/api/tickets", "/api/tickets/:path*"],
};
