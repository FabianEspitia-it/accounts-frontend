import { fetchRefreshedSession } from "./refresh-session";

/** Calls POST /users/refresh with refresh_token cookie; returns new access token or null. */
export async function fetchNewAccessToken(
  refreshToken: string
): Promise<string | null> {
  const session = await fetchRefreshedSession(refreshToken);
  return session?.accessToken ?? null;
}
