/** Valor de refresh_token listo para enviar al backend. */
export function normalizeRefreshToken(token: string): string {
  return token.replace(/^Bearer\s+/i, "").trim();
}
