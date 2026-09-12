/** Cookie names aligned with API (`refresh_token` is sent to POST /users/refresh). */
export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";

/** Access token TTL (15 minutes). */
export const ACCESS_MAX_AGE_SEC = 15 * 60;

/** Refresh token TTL (7 days). */
export const REFRESH_MAX_AGE_SEC = 7 * 24 * 60 * 60;

export { getBackendBaseUrl } from "@/lib/env";
