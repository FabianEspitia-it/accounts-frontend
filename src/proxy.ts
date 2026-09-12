import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  applySessionCookiesToRequest,
  applySessionCookiesToResponse,
  clearSessionCookiesOnResponse,
} from "@/lib/auth/apply-session-cookies";
import {
  ACCESS_TOKEN_COOKIE,
} from "@/lib/auth/constants";
import { isAccessTokenValid } from "@/lib/auth/is-access-token-valid";
import { isPublicPagePath } from "@/lib/auth/public-paths";
import { getRefreshTokenCandidatesFromRequest } from "@/lib/auth/read-request-cookies";
import { resolveRefreshedSession } from "@/lib/auth/refresh-session";

function isPublicPath(pathname: string): boolean {
  if (isPublicPagePath(pathname)) return true;
  if (pathname === "/api/auth/signin") return true;
  if (pathname.startsWith("/api/auth/signin/")) return true;
  if (pathname === "/api/auth/login") return true;
  if (pathname.startsWith("/api/auth/login/")) return true;
  if (pathname === "/api/auth/logout") return true;
  if (pathname.startsWith("/api/auth/logout/")) return true;
  if (pathname === "/api/auth/refresh") return true;
  if (pathname.startsWith("/api/auth/refresh/")) return true;
  if (pathname === "/api/auth/access-token") return true;
  if (pathname.startsWith("/api/auth/access-token/")) return true;
  return false;
}

function isLoginPath(pathname: string): boolean {
  return pathname === "/login" || pathname.startsWith("/login/");
}

function isRefreshApiPath(pathname: string): boolean {
  return (
    pathname === "/api/auth/refresh" ||
    pathname.startsWith("/api/auth/refresh/")
  );
}

function isRscRequest(request: NextRequest): boolean {
  return (
    request.headers.get("Rsc") === "1" ||
    request.headers.get("Next-Router-Prefetch") === "1"
  );
}

function redirectToLogin(request: NextRequest): NextResponse {
  return NextResponse.redirect(new URL("/login", request.url));
}

function applyRefreshedSession(
  request: NextRequest,
  response: NextResponse,
  session: { accessToken: string; refreshToken: string }
): void {
  applySessionCookiesToResponse(response, session);
  applySessionCookiesToRequest(request, session);
}

function continueWithRefreshedSession(
  request: NextRequest,
  session: { accessToken: string; refreshToken: string }
): NextResponse {
  const requestHeaders = applySessionCookiesToRequest(request, session);
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  applySessionCookiesToResponse(response, session);
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshCandidates = getRefreshTokenCandidatesFromRequest(request);
  const refreshToken = refreshCandidates[0];
  const valid = isAccessTokenValid(token);

  if (valid) {
    if (isLoginPath(pathname)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (refreshCandidates.length > 0 && !isRefreshApiPath(pathname)) {
    const session = await resolveRefreshedSession(refreshCandidates);

    if (session) {
      if (isLoginPath(pathname)) {
        const response = NextResponse.redirect(new URL("/", request.url));
        applyRefreshedSession(request, response, session);
        return response;
      }

      return continueWithRefreshedSession(request, session);
    }
  }

  if (isPublicPath(pathname)) {
    if (isLoginPath(pathname) && refreshToken) {
      const response = NextResponse.next();
      clearSessionCookiesOnResponse(response);
      return response;
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ detail: "No autenticado" }, { status: 401 });
  }

  // Peticiones RSC/prefetch ocultas en Network: no redirigir; el documento principal renueva.
  if (isRscRequest(request)) {
    return NextResponse.next();
  }

  return redirectToLogin(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_next/data|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|eot)$).*)",
  ],
};
