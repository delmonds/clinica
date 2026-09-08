import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

/** Páginas da equipe: exigem login em qualquer método. */
const PROTECTED_PAGES = ["/recepcao", "/relatorios"];

/** Rotas de API restritas à equipe também na leitura. */
const PROTECTED_API_PATTERNS: RegExp[] = [/^\/api\/reports$/];

/** Rotas de API públicas para leitura, restritas para escrita. */
const PROTECTED_API_WRITE_PATTERNS: RegExp[] = [
  /^\/api\/queues$/, // POST cria fila
  /^\/api\/queues\/[^/]+\/call-next$/,
  /^\/api\/tickets$/, // POST emite senha (GET de consulta continua público)
  /^\/api\/tickets\/[^/]+\/(start|finish|no-show|cancel)$/,
];

function isProtectedApiRoute(pathname: string, method: string): boolean {
  if (PROTECTED_API_PATTERNS.some((pattern) => pattern.test(pathname))) return true;

  const isRead = method === "GET" || method === "HEAD" || method === "OPTIONS";
  return !isRead && PROTECTED_API_WRITE_PATTERNS.some((pattern) => pattern.test(pathname));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  if (PROTECTED_PAGES.some((page) => pathname.startsWith(page))) {
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
  matcher: [
    "/recepcao/:path*",
    "/relatorios/:path*",
    "/api/queues",
    "/api/queues/:path*",
    "/api/tickets",
    "/api/tickets/:path*",
    "/api/reports",
  ],
};
