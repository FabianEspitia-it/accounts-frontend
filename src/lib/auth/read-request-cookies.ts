import type { NextRequest } from "next/server";
import { REFRESH_TOKEN_COOKIE } from "./constants";
import { normalizeRefreshToken } from "./normalize-refresh-token";

function decodeJwtIat(token: string): number | null {
  const parts = token.split(".");
  if (parts.length !== 3 || !parts[1]) return null;

  try {
    const segment = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = segment.length % 4;
    const padded = pad === 0 ? segment : segment + "=".repeat(4 - pad);
    const payload = JSON.parse(atob(padded)) as { iat?: number };
    return typeof payload.iat === "number" ? payload.iat : null;
  } catch {
    return null;
  }
}

function addCandidate(seen: Set<string>, tokens: string[], raw: string | undefined): void {
  const token = raw ? normalizeRefreshToken(raw) : "";
  if (!token || seen.has(token)) return;
  seen.add(token);
  tokens.push(token);
}

/** Todos los refresh_token distintos del request (p. ej. host-only + .domain en prod). */
export function getRefreshTokenCandidatesFromRequest(
  request: NextRequest
): string[] {
  const seen = new Set<string>();
  const tokens: string[] = [];

  const raw = request.headers.get("cookie");
  if (raw) {
    for (const match of raw.matchAll(/refresh_token=([^;]+)/gi)) {
      addCandidate(seen, tokens, decodeURIComponent(match[1].trim()));
    }
  }

  addCandidate(seen, tokens, request.cookies.get(REFRESH_TOKEN_COOKIE)?.value);

  return tokens.sort((a, b) => (decodeJwtIat(b) ?? 0) - (decodeJwtIat(a) ?? 0));
}

/** Un solo candidato (compatibilidad). */
export function getRefreshTokenFromRequest(
  request: NextRequest
): string | undefined {
  return getRefreshTokenCandidatesFromRequest(request)[0];
}
