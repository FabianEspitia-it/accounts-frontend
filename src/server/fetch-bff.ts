import { headers } from "next/headers";

export { fetchBackendApi } from "./fetch-backend-api";

/**
 * Petición desde un Server Component a una ruta propia (`/api/...`) reenviando cookies.
 */
export async function fetchBff(pathWithQuery: string, init?: RequestInit) {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  const base =
    host != null
      ? `${proto}://${host}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";

  return fetch(`${base}${pathWithQuery}`, {
    ...init,
    headers: {
      ...init?.headers,
      cookie: h.get("cookie") ?? "",
    },
    cache: "no-store",
  });
}