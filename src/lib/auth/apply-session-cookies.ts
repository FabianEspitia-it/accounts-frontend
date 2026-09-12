import type { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from "./constants";
import {
  accessTokenCookie,
  clearedCookieVariants,
  refreshTokenCookie,
} from "./cookie-options";
import type { RefreshedSession } from "./refresh-session";

function buildCookieHeader(
  rawCookieHeader: string | null,
  session: RefreshedSession
): string {
  const jar = new Map<string, string>();

  if (rawCookieHeader) {
    for (const part of rawCookieHeader.split(";")) {
      const trimmed = part.trim();
      const idx = trimmed.indexOf("=");
      if (idx <= 0) continue;
      jar.set(trimmed.slice(0, idx).trim(), trimmed.slice(idx + 1).trim());
    }
  }

  jar.set(ACCESS_TOKEN_COOKIE, session.accessToken);
  jar.set(REFRESH_TOKEN_COOKIE, session.refreshToken);

  return Array.from(jar.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

export function applySessionCookiesToResponse(
  response: NextResponse,
  session: RefreshedSession
): void {
  clearSessionCookiesOnResponse(response);

  const access = accessTokenCookie(session.accessToken);
  const refresh = refreshTokenCookie(session.refreshToken);
  response.cookies.set(access.name, access.value, access.opts);
  response.cookies.set(refresh.name, refresh.value, refresh.opts);
}

/** Para que los route handlers vean los tokens renovados en la misma petición. */
export function applySessionCookiesToRequest(
  request: NextRequest,
  session: RefreshedSession
): Headers {
  request.cookies.set(ACCESS_TOKEN_COOKIE, session.accessToken);
  request.cookies.set(REFRESH_TOKEN_COOKIE, session.refreshToken);

  const headers = new Headers(request.headers);
  headers.set("cookie", buildCookieHeader(request.headers.get("cookie"), session));
  return headers;
}

export function clearSessionCookiesOnResponse(response: NextResponse): void {
  for (const variant of clearedCookieVariants(ACCESS_TOKEN_COOKIE)) {
    response.cookies.set(variant.name, variant.value, variant.opts);
  }
  for (const variant of clearedCookieVariants(REFRESH_TOKEN_COOKIE)) {
    response.cookies.set(variant.name, variant.value, variant.opts);
  }
}
