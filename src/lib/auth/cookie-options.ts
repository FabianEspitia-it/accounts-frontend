import {
  ACCESS_MAX_AGE_SEC,
  ACCESS_TOKEN_COOKIE,
  REFRESH_MAX_AGE_SEC,
  REFRESH_TOKEN_COOKIE,
} from "./constants";

const isProd = process.env.NODE_ENV === "production";

/** En Vercel prod: p. ej. `.accountspremiummm.com` para compartir cookies entre www y apex. */
const cookieDomain = process.env.COOKIE_DOMAIN?.trim() || undefined;

type CookieOpts = {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
  domain?: string;
};

function sharedCookieOpts(maxAge: number): CookieOpts {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge,
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  };
}

export function accessTokenCookie(value: string): { name: string; value: string; opts: CookieOpts } {
  return {
    name: ACCESS_TOKEN_COOKIE,
    value,
    opts: sharedCookieOpts(ACCESS_MAX_AGE_SEC),
  };
}

export function refreshTokenCookie(value: string): { name: string; value: string; opts: CookieOpts } {
  return {
    name: REFRESH_TOKEN_COOKIE,
    value,
    opts: sharedCookieOpts(REFRESH_MAX_AGE_SEC),
  };
}

export function clearedCookie(name: string): { name: string; value: string; opts: CookieOpts } {
  return {
    name,
    value: "",
    opts: sharedCookieOpts(0),
  };
}

/** Borra variantes host-only y con dominio (evita cookies huérfanas en prod). */
export function clearedCookieVariants(name: string): Array<{
  name: string;
  value: string;
  opts: CookieOpts;
}> {
  const primary = clearedCookie(name);
  if (!cookieDomain) return [primary];

  const { domain: _domain, ...hostOnlyOpts } = primary.opts;
  return [
    primary,
    { name: primary.name, value: primary.value, opts: hostOnlyOpts },
  ];
}
