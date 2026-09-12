/**
 * URL base del backend (`BACKEND_API_URL`).
 * Servidor: variable de entorno directa.
 * Cliente: misma variable, inyectada en build vía `next.config.mjs` → `env`.
 */
export function getBackendBaseUrl(): string {
  const base = process.env.BACKEND_API_URL?.replace(/\/$/, "");
  if (!base) {
    throw new Error("BACKEND_API_URL is not configured");
  }
  return base;
}
