export type UserRole = "admin" | "advisor" | "reseller";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  advisor: "Asesor",
  reseller: "Revendedor",
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: "Administra usuarios, cuentas y vínculos.",
  advisor: "Empleado interno: puede consultar códigos de cualquier correo.",
  reseller:
    "Solo los correos que le asignes, y el acceso vence a los 30 días.",
};

/** Roles que el panel puede asignar al crear o editar un usuario. */
export const ASSIGNABLE_ROLES: UserRole[] = ["advisor", "reseller"];

export function roleLabel(role?: string | null): string {
  if (!role) return "—";
  return ROLE_LABELS[role as UserRole] ?? role;
}

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

/** Las fechas llegan del backend en hora de Colombia y sin zona. */
function parseColombiaDate(iso: string): Date | null {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatExpiry(iso?: string | null): string | null {
  if (!iso) return null;
  const date = parseColombiaDate(iso);
  return date ? dateFormatter.format(date) : null;
}

/** Días restantes (negativo si ya venció). */
export function daysUntilExpiry(iso?: string | null): number | null {
  if (!iso) return null;
  const date = parseColombiaDate(iso);
  if (!date) return null;
  return Math.ceil((date.getTime() - Date.now()) / 86_400_000);
}
