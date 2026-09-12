import { getClientAccessToken } from "@/lib/auth/get-client-access-token";
import { getBackendBaseUrl } from "@/lib/env";

export type StreamingResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number };

export type CodeResponse = { code: string };
export type LinkResponse = { link: string };

type Service =
  | "netflix"
  | "disney"
  | "hbo"
  | "prime"
  | "spotify"
  | "youtube"
  | "universal"
  | "crunchyroll";

/**
 * Overrides heredados del esquema anterior (`NEXT_PUBLIC_<SERVICIO>` = URL completa
 * del servicio). Si no están definidos se usa `${BACKEND_API_URL}/<servicio>`.
 */
const SERVICE_BASE_OVERRIDES: Record<Service, string | undefined> = {
  netflix: process.env.NEXT_PUBLIC_NETFLIX,
  disney: process.env.NEXT_PUBLIC_DISNEY,
  hbo: process.env.NEXT_PUBLIC_HBO,
  prime: process.env.NEXT_PUBLIC_PRIME,
  spotify: process.env.NEXT_PUBLIC_SPOTIFY,
  youtube: process.env.NEXT_PUBLIC_YOUTUBE,
  universal: process.env.NEXT_PUBLIC_UNIVERSAL,
  crunchyroll: process.env.NEXT_PUBLIC_CRUNCHYROLL,
};

function buildServiceUrl(service: Service, path: string): string {
  const override = SERVICE_BASE_OVERRIDES[service]?.trim().replace(/\/$/, "");
  const base = override || `${getBackendBaseUrl()}/${service}`;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

async function authHeaders(): Promise<Headers | null> {
  const access = await getClientAccessToken();
  if (!access) return null;

  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  headers.set("Authorization", `Bearer ${access}`);
  return headers;
}

async function request<T>(
  service: Service,
  path: string,
  init: { method: "GET" } | { method: "POST"; body: unknown }
): Promise<StreamingResult<T>> {
  const headers = await authHeaders();
  if (!headers) {
    return { ok: false, status: 401 };
  }

  try {
    const res = await fetch(buildServiceUrl(service, path), {
      method: init.method,
      headers,
      body: init.method === "POST" ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });

    if (!res.ok) {
      return { ok: false, status: res.status };
    }

    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (error) {
    console.error(`${service} request error`, error);
    return { ok: false, status: 0 };
  }
}

function postJson<T>(
  service: Service,
  path: string,
  body: unknown
): Promise<StreamingResult<T>> {
  return request<T>(service, path, { method: "POST", body });
}

function getJson<T>(service: Service, path: string): Promise<StreamingResult<T>> {
  return request<T>(service, path, { method: "GET" });
}

/* ---------------------------------- Netflix --------------------------------- */

export function requestNetflixSessionCode(
  email: string
): Promise<StreamingResult<CodeResponse>> {
  return postJson<CodeResponse>("netflix", "/session_code/", { email });
}

export function requestNetflixPasswordReset(
  email: string
): Promise<StreamingResult<LinkResponse>> {
  return postJson<LinkResponse>("netflix", "/password_reset/", { email });
}

export function requestNetflixUpdateHome(
  email: string
): Promise<StreamingResult<LinkResponse>> {
  return getJson<LinkResponse>("netflix", `/home_code/${encodeURIComponent(email)}`);
}

export function requestNetflixTemporalAccess(
  email: string
): Promise<StreamingResult<LinkResponse>> {
  return getJson<LinkResponse>(
    "netflix",
    `/temporal_access/${encodeURIComponent(email)}`
  );
}

export function requestNetflixNewSession(
  email: string
): Promise<StreamingResult<LinkResponse>> {
  return getJson<LinkResponse>("netflix", `/new_session/${encodeURIComponent(email)}`);
}

/* ---------------------------------- Disney ---------------------------------- */

export function requestDisneySessionCode(
  email: string
): Promise<StreamingResult<CodeResponse>> {
  return postJson<CodeResponse>("disney", "/session_code/", { email });
}

export function requestDisneyHomeCode(
  email: string
): Promise<StreamingResult<CodeResponse>> {
  return postJson<CodeResponse>("disney", "/home_code/", { email });
}

/* ------------------------------------ HBO ----------------------------------- */

export function requestHboSessionCode(
  email: string
): Promise<StreamingResult<CodeResponse>> {
  return postJson<CodeResponse>("hbo", "/session_code/", { email });
}

export function requestHboPasswordReset(
  email: string
): Promise<StreamingResult<LinkResponse>> {
  return postJson<LinkResponse>("hbo", "/restor_password/", { email });
}

/* ----------------------------------- Prime ---------------------------------- */

export function requestPrimeSessionCode(
  email: string
): Promise<StreamingResult<CodeResponse>> {
  return postJson<CodeResponse>("prime", "/session_code/", { email });
}

/* ---------------------------------- Spotify --------------------------------- */

export function requestSpotifySessionCode(
  email: string
): Promise<StreamingResult<CodeResponse>> {
  return postJson<CodeResponse>("spotify", "/session_code/", { email });
}

/* ---------------------------------- YouTube --------------------------------- */

export function requestYoutubeSessionCode(
  email: string
): Promise<StreamingResult<CodeResponse>> {
  return getJson<CodeResponse>(
    "youtube",
    `/session_code/${encodeURIComponent(email)}`
  );
}

/* --------------------------------- Universal -------------------------------- */

export function requestUniversalActivationCode(
  email: string
): Promise<StreamingResult<CodeResponse>> {
  return postJson<CodeResponse>("universal", "/session_code/", { email });
}

/* -------------------------------- Crunchyroll ------------------------------- */

export function requestCrunchyrollLoginLink(
  email: string
): Promise<StreamingResult<LinkResponse>> {
  return getJson<LinkResponse>(
    "crunchyroll",
    `/login_link/${encodeURIComponent(email)}`
  );
}
