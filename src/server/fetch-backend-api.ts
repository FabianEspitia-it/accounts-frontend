import { getBackendBaseUrl } from "@/lib/auth/constants";

/**
 * Petición desde Route Handlers / middleware al backend (`BACKEND_API_URL`).
 * `path` debe empezar con `/`, p. ej. `/users/login`.
 */
export function fetchBackendApi(path: string, init?: RequestInit): Promise<Response> {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return fetch(`${getBackendBaseUrl()}${normalized}`, {
    ...init,
    cache: "no-store",
  });
}
