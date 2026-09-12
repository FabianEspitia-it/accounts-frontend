/** Rutas accesibles sin sesión (solo login). */
export const PUBLIC_PAGE_PATHS = ["/login"] as const;

export function isPublicPagePath(pathname: string): boolean {
  return PUBLIC_PAGE_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

/** Panel admin: requiere sesión válida y JWT con is_admin. */
export function isDashboardPath(pathname: string): boolean {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}
