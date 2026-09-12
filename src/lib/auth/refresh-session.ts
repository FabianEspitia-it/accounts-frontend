import { REFRESH_TOKEN_COOKIE } from "./constants";
import { normalizeRefreshToken } from "./normalize-refresh-token";
import { parseSessionFromRefreshResponse } from "./parse-session-from-refresh-response";
import { fetchBackendApi } from "@/server/fetch-backend-api";

export type RefreshedSession = {
  accessToken: string;
  refreshToken: string;
};

/** Evita POST /users/refresh duplicados (RSC/prefetch en paralelo). */
const inflightByRefreshToken = new Map<
  string,
  Promise<RefreshedSession | null>
>();

/** Evita perder sesión si el refresh anterior ya rotó el token (p. ej. 2.ª petición oculta). */
const recentByRefreshToken = new Map<
  string,
  { session: RefreshedSession; expiresAt: number }
>();

const RECENT_SESSION_MS = 30_000;

function rememberSession(
  usedTokens: string[],
  session: RefreshedSession
): void {
  const expiresAt = Date.now() + RECENT_SESSION_MS;
  const keys = new Set<string>([
    ...usedTokens.map(normalizeRefreshToken),
    normalizeRefreshToken(session.refreshToken),
  ]);

  for (const key of keys) {
    if (key) recentByRefreshToken.set(key, { session, expiresAt });
  }
}

function recallSession(refreshTokens: string[]): RefreshedSession | null {
  const now = Date.now();

  for (const raw of refreshTokens) {
    const key = normalizeRefreshToken(raw);
    if (!key) continue;

    const hit = recentByRefreshToken.get(key);
    if (hit && hit.expiresAt > now) return hit.session;
  }

  return null;
}

async function fetchRefreshedSessionOnce(
  rawRefreshToken: string
): Promise<RefreshedSession | null> {
  const refreshToken = normalizeRefreshToken(rawRefreshToken);
  if (!refreshToken) return null;

  const cached = recallSession([refreshToken]);
  if (cached) return cached;

  const existing = inflightByRefreshToken.get(refreshToken);
  if (existing) return existing;

  const promise = (async (): Promise<RefreshedSession | null> => {
    try {
      const res = await fetchBackendApi("/users/refresh", {
        method: "POST",
        headers: {
          Cookie: `${REFRESH_TOKEN_COOKIE}=${refreshToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!res.ok) return null;

      try {
        const parsed = await parseSessionFromRefreshResponse(res);
        if (!parsed.accessToken) return null;

        const session: RefreshedSession = {
          accessToken: parsed.accessToken,
          refreshToken: parsed.refreshToken ?? refreshToken,
        };
        rememberSession([refreshToken], session);
        return session;
      } catch {
        return null;
      }
    } catch {
      return null;
    }
  })().finally(() => {
    if (inflightByRefreshToken.get(refreshToken) === promise) {
      inflightByRefreshToken.delete(refreshToken);
    }
  });

  inflightByRefreshToken.set(refreshToken, promise);
  return promise;
}

async function resolveRefreshedSessionOnce(
  refreshTokens: string[]
): Promise<RefreshedSession | null> {
  const seen = new Set<string>();
  const tried: string[] = [];

  for (const raw of refreshTokens) {
    const refreshToken = normalizeRefreshToken(raw);
    if (!refreshToken || seen.has(refreshToken)) continue;
    seen.add(refreshToken);
    tried.push(refreshToken);

    const session = await fetchRefreshedSessionOnce(refreshToken);
    if (session) {
      rememberSession(tried, session);
      return session;
    }
  }

  return null;
}

/** Prueba cada refresh_token; deduplica peticiones paralelas con el mismo token. */
export async function resolveRefreshedSession(
  refreshTokens: string[]
): Promise<RefreshedSession | null> {
  if (refreshTokens.length === 0) return null;

  const cached = recallSession(refreshTokens);
  if (cached) return cached;

  return resolveRefreshedSessionOnce(refreshTokens);
}

/** Renueva la sesión con POST /users/refresh. */
export async function fetchRefreshedSession(
  refreshToken: string
): Promise<RefreshedSession | null> {
  return fetchRefreshedSessionOnce(refreshToken);
}
