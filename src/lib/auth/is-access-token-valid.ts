/** Decodifica el payload JWT sin depender de `Buffer` (Edge/Node). */
type AccessJwtPayload = { exp?: number; is_admin?: boolean };

function decodeJwtPayload(token: string): AccessJwtPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3 || !parts[1]) return null;
  try {
    const segment = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = segment.length % 4;
    const padded = pad === 0 ? segment : segment + "=".repeat(4 - pad);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json) as AccessJwtPayload;
  } catch {
    return null;
  }
}

export function normalizeAccessToken(token: string): string {
  return token.replace(/^Bearer\s+/i, "").trim();
}

export function isAccessTokenValid(token: string | undefined): boolean {
  if (!token) return false;
  const payload = decodeJwtPayload(normalizeAccessToken(token));
  if (!payload || typeof payload.exp !== "number") return false;
  const skewMs = 5000;
  return payload.exp * 1000 > Date.now() - skewMs;
}

export function isAdminAccessToken(token: string | undefined): boolean {
  if (!isAccessTokenValid(token)) return false;
  const payload = decodeJwtPayload(normalizeAccessToken(token!));
  return payload?.is_admin === true;
}
