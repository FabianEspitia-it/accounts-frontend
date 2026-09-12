import { normalizeAccessToken } from "./is-access-token-valid";
import {
  parseAccessTokenFromSetCookie,
  parseRefreshTokenFromSetCookie,
} from "./parse-set-cookie";

type ParsedRefreshResponse = {
  accessToken: string;
  refreshToken?: string;
};

function readAccessFromObject(o: Record<string, unknown>): string | undefined {
  const direct =
    o.access_token ?? o.accessToken ?? o.token ?? o.access;
  if (typeof direct === "string") return direct;

  const nested = o.data;
  if (nested && typeof nested === "object") {
    const inner = nested as Record<string, unknown>;
    const fromNested =
      inner.access_token ?? inner.accessToken ?? inner.token ?? inner.access;
    if (typeof fromNested === "string") return fromNested;
  }

  return undefined;
}

function readRefreshFromObject(
  o: Record<string, unknown>,
  refreshFromHeader: string | undefined
): string | undefined {
  const direct = o.refresh_token ?? o.refreshToken;
  if (typeof direct === "string") return direct;

  const nested = o.data;
  if (nested && typeof nested === "object") {
    const inner = nested as Record<string, unknown>;
    const fromNested = inner.refresh_token ?? inner.refreshToken;
    if (typeof fromNested === "string") return fromNested;
  }

  return refreshFromHeader;
}

/** Lee access (+ refresh opcional) del body y/o Set-Cookie de POST /users/refresh. */
export async function parseSessionFromRefreshResponse(
  res: Response
): Promise<ParsedRefreshResponse> {
  const refreshFromHeader = parseRefreshTokenFromSetCookie(res.headers);
  const accessFromHeader = parseAccessTokenFromSetCookie(res.headers);
  const ct = res.headers.get("content-type") ?? "";
  const raw = await res.text();
  const text = raw.trim();

  if (ct.includes("application/json") || (text.startsWith("{") && text.endsWith("}"))) {
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Invalid JSON in refresh response");
      }
    }

    if (typeof data === "string") {
      const accessToken = normalizeAccessToken(data);
      if (!accessToken) throw new Error("Empty refresh response");
      return { accessToken, refreshToken: refreshFromHeader };
    }

    if (data && typeof data === "object") {
      const o = data as Record<string, unknown>;
      const accessRaw = readAccessFromObject(o) ?? accessFromHeader;
      const refreshRaw = readRefreshFromObject(o, refreshFromHeader);

      if (typeof accessRaw !== "string") {
        throw new Error("Refresh response did not include an access token");
      }

      return {
        accessToken: normalizeAccessToken(accessRaw),
        refreshToken: refreshRaw,
      };
    }
  }

  if (text) {
    return {
      accessToken: normalizeAccessToken(text),
      refreshToken: refreshFromHeader,
    };
  }

  if (accessFromHeader) {
    return {
      accessToken: normalizeAccessToken(accessFromHeader),
      refreshToken: refreshFromHeader,
    };
  }

  throw new Error("Empty refresh response");
}
