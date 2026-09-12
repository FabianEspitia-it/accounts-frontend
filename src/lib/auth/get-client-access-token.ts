/**
 * Obtiene el access token desde la cookie httpOnly vía el BFF de Next.
 * Si expiró, intenta renovar con POST /api/auth/refresh.
 */
export async function getClientAccessToken(): Promise<string | null> {
  const token = await fetchAccessToken();
  if (token) return token;

  const refreshed = await fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
  });
  if (!refreshed.ok) return null;

  return fetchAccessToken();
}

async function fetchAccessToken(): Promise<string | null> {
  const res = await fetch("/api/auth/access-token", {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) return null;

  try {
    const data = (await res.json()) as { access_token?: string };
    const token = data.access_token?.trim();
    return token || null;
  } catch {
    return null;
  }
}
