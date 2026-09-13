"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

import {
  ASSIGNABLE_ROLES,
  ROLE_DESCRIPTIONS,
  UserRole,
  daysUntilExpiry,
  formatExpiry,
  roleLabel,
} from "@/lib/roles";
import PhoneNumberField, {
  formatPhoneNumber,
  isPhoneNumberUsable,
} from "@/components/PhoneNumberField";
import Modal from "../_components/Modal";
import {
  BTN_ACCENT,
  BTN_DANGER,
  BTN_GHOST,
  BTN_NEUTRAL,
  CARD,
  INPUT_CLASS,
  LABEL_CLASS,
  PAGER,
  TH,
} from "../_components/ui";

/** Acción compacta dentro de una fila de la tabla. */
const ROW_ACTION =
  "inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-2.5 py-1.5 text-[0.7rem] font-medium text-white/50 ring-1 ring-white/[0.07] transition hover:bg-white/[0.08] hover:text-white";

type Account = {
  id: string;
  email: string;
  /** Solo los revendedores tienen vencimiento; en asesores llega null. */
  expires_at?: string | null;
  is_expired?: boolean;
};

/**
 * Correo y número son identificadores de login intercambiables: el usuario
 * tiene al menos uno, pero puede no tener los dos.
 */
type User = {
  id: string;
  email?: string | null;
  /** En E.164 (+573001234567). */
  phone_number?: string | null;
  role?: UserRole;
  accounts?: Account[];
};

/** Cómo se nombra al usuario en pantalla: su correo o, si no tiene, su número. */
function displayName(user: User): string {
  if (user.email) return user.email;
  if (user.phone_number) return formatPhoneNumber(user.phone_number);
  return "—";
}

type ListResponse = {
  total: number;
  skip: number;
  limit: number;
  users?: User[];
};

const PAGE_SIZE = 20;

/** Caja del campo de teléfono: mismo aspecto que INPUT_CLASS pero con focus-within,
 *  porque el foco lo recibe el input interno de react-phone-number-input. */
const PHONE_FIELD_CLASS =
  "w-full rounded-xl border border-white/[0.07] bg-white/[0.03] px-3.5 py-2 text-[0.8rem] text-white transition " +
  "focus-within:border-[#ff0055]/40 focus-within:bg-[#ff0055]/[0.03] focus-within:shadow-[0_0_0_3px_rgba(255,0,85,0.06)]";

const PHONE_HINT =
  "Elige el país y escribe el número; con él podrá iniciar sesión.";

/** El backend responde en inglés; aquí se traduce lo que ve el admin. */
const ERROR_MESSAGES_ES: Record<string, string> = {
  "user already exists": "Ya existe un usuario con ese correo",
  "user not found": "Usuario no encontrado",
  "phone number already in use": "Ese número ya está asignado a otro usuario",
  "user needs an email or a phone number":
    "El usuario se quedaría sin forma de entrar: necesita correo o número",
  "número de teléfono inválido": "Número de teléfono inválido",
};

function translateError(message: string): string {
  return ERROR_MESSAGES_ES[message.trim().toLowerCase()] ?? message;
}

async function readError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.error === "string") return translateError(data.error);
    if (typeof data?.detail === "string") return translateError(data.detail);
    if (Array.isArray(data?.detail) && data.detail[0]?.msg) {
      return translateError(String(data.detail[0].msg));
    }
  } catch {
    /* fallthrough */
  }
  return `Error ${res.status}`;
}

export default function UsersClient() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  const [roleFilter, setRoleFilter] = useState<"" | UserRole>("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createEmail, setCreateEmail] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState<UserRole>("reseller");
  const [creating, setCreating] = useState(false);

  const [phoneTarget, setPhoneTarget] = useState<User | null>(null);
  const [nextPhone, setNextPhone] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);

  const [roleTarget, setRoleTarget] = useState<User | null>(null);
  const [nextRole, setNextRole] = useState<UserRole>("reseller");
  const [savingRole, setSavingRole] = useState(false);

  const [renewTarget, setRenewTarget] = useState<User | null>(null);
  const [selectedRenewIds, setSelectedRenewIds] = useState<string[]>([]);
  const [renewing, setRenewing] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [passwordTarget, setPasswordTarget] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [unlinkTarget, setUnlinkTarget] = useState<User | null>(null);
  const [unlinkQuery, setUnlinkQuery] = useState("");
  const [selectedUnlinkIds, setSelectedUnlinkIds] = useState<string[]>([]);
  const [unlinking, setUnlinking] = useState(false);

  const [accountEmailQuery, setAccountEmailQuery] = useState("");

  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [debouncedAccountEmail, setDebouncedAccountEmail] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setSkip(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedAccountEmail(accountEmailQuery.trim());
      setSkip(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [accountEmailQuery]);

  const fetchUsers = useCallback(
    async (
      currentSkip: number,
      searchTerm: string,
      accountEmail: string,
      role: "" | UserRole,
      signal: AbortSignal
    ) => {
      const params = new URLSearchParams();
      params.set("skip", String(currentSkip));
      params.set("limit", String(PAGE_SIZE));
      if (searchTerm) {
        // `search` cubre correo y número; `email` solo filtraba por correo.
        params.set("search", searchTerm);
      }
      if (accountEmail) {
        params.set("account_email", accountEmail);
      }
      if (role) {
        params.set("role", role);
      }

      const res = await fetch(`/api/upstream/users?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
        signal,
      });

      if (!res.ok) {
        const msg = await readError(res);
        throw new Error(msg);
      }

      return (await res.json()) as ListResponse;
    },
    []
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setErrorMsg(null);

    (async () => {
      try {
        const data = await fetchUsers(
          skip,
          debouncedQuery,
          debouncedAccountEmail,
          roleFilter,
          controller.signal
        );
        setUsers(Array.isArray(data?.users) ? data.users : []);
        setTotal(typeof data?.total === "number" ? data.total : 0);
      } catch (err) {
        if (controller.signal.aborted) return;
        const message =
          err instanceof Error ? err.message : "No se pudo conectar con el servidor";
        setErrorMsg(message);
        setUsers([]);
        setTotal(0);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [skip, debouncedQuery, debouncedAccountEmail, roleFilter, reloadToken, fetchUsers]);

  function reload() {
    setReloadToken((k) => k + 1);
  }

  const currentPage = Math.floor(skip / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : skip + 1;
  const rangeEnd = Math.min(skip + PAGE_SIZE, total);
  const canPrev = skip > 0 && !loading;
  const canNext = skip + PAGE_SIZE < total && !loading;

  function goPrev() {
    if (!canPrev) return;
    setSkip(Math.max(0, skip - PAGE_SIZE));
  }
  function goNext() {
    if (!canNext) return;
    setSkip(skip + PAGE_SIZE);
  }

  function openCreate() {
    setCreateEmail("");
    setCreatePhone("");
    setCreatePassword("");
    setCreateRole("reseller");
    setCreateOpen(true);
  }

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = createEmail.trim();
    const phone = createPhone.trim();
    const password = createPassword;
    if (!email && !phone) {
      toast.error("Indica al menos un correo o un número");
      return;
    }
    if (!password) {
      toast.error("La contraseña es obligatoria");
      return;
    }
    if (phone && !isPhoneNumberUsable(phone)) {
      toast.error("El número de teléfono no es válido");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/upstream/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email || null,
          password,
          role: createRole,
          phone_number: phone || null,
        }),
      });
      if (!res.ok) {
        toast.error(await readError(res));
        return;
      }
      toast.success(`Usuario creado como ${roleLabel(createRole).toLowerCase()}`);
      setCreateOpen(false);
      reload();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setCreating(false);
    }
  }

  function openPhone(user: User) {
    setPhoneTarget(user);
    setNextPhone(user.phone_number ?? "");
  }

  async function handleUpdatePhone(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!phoneTarget) return;

    const phone = nextPhone.trim();
    if (!phone && !phoneTarget.email) {
      toast.error("No puedes quitar el único dato con el que inicia sesión");
      return;
    }
    if (phone && !isPhoneNumberUsable(phone)) {
      toast.error("El número de teléfono no es válido");
      return;
    }

    setSavingPhone(true);
    try {
      const res = await fetch(
        `/api/upstream/users/${encodeURIComponent(phoneTarget.id)}/phone`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone_number: phone || null }),
        }
      );
      if (!res.ok) {
        toast.error(await readError(res));
        return;
      }
      const data = (await res.json().catch(() => ({}))) as {
        user?: { phone_number?: string | null };
      };
      const saved = data.user?.phone_number ?? null;
      toast.success(saved ? "Número asignado" : "Número eliminado");
      setUsers((prev) =>
        prev.map((u) =>
          u.id === phoneTarget.id ? { ...u, phone_number: saved } : u
        )
      );
      setPhoneTarget(null);
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSavingPhone(false);
    }
  }

  function openRole(user: User) {
    setRoleTarget(user);
    setNextRole(user.role === "advisor" ? "advisor" : "reseller");
  }

  async function handleUpdateRole(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!roleTarget) return;

    if (nextRole === roleTarget.role) {
      setRoleTarget(null);
      return;
    }

    setSavingRole(true);
    try {
      const res = await fetch(
        `/api/upstream/users/${encodeURIComponent(roleTarget.id)}/role`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: nextRole }),
        }
      );
      if (!res.ok) {
        toast.error(await readError(res));
        return;
      }
      toast.success(`Rol actualizado a ${roleLabel(nextRole).toLowerCase()}`);
      setRoleTarget(null);
      reload();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSavingRole(false);
    }
  }

  function openRenew(user: User) {
    setRenewTarget(user);
    setSelectedRenewIds((user.accounts ?? []).map((a) => a.id));
  }

  function toggleRenew(id: string) {
    setSelectedRenewIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleRenew(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!renewTarget) return;
    if (selectedRenewIds.length === 0) {
      toast.error("Selecciona al menos una cuenta");
      return;
    }

    setRenewing(true);
    try {
      const res = await fetch("/api/upstream/accounts/renew-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: renewTarget.id,
          account_ids: selectedRenewIds,
        }),
      });
      if (!res.ok) {
        toast.error(await readError(res));
        return;
      }
      toast.success("Acceso renovado por 30 días");
      setRenewTarget(null);
      reload();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setRenewing(false);
    }
  }

  async function handleDelete(user: User) {
    setDeletingId(user.id);
    try {
      const res = await fetch(
        `/api/upstream/users/${encodeURIComponent(user.id)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        toast.error(await readError(res));
        return;
      }
      toast.success("Usuario eliminado");
      setConfirmDelete(null);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch {
      toast.error("Error de conexión");
    } finally {
      setDeletingId(null);
    }
  }

  function openPassword(user: User) {
    setPasswordTarget(user);
    setNewPassword("");
    setConfirmPassword("");
    setShowPassword(false);
  }

  async function handleUpdatePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!passwordTarget) return;

    if (newPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch(
        `/api/upstream/users/${encodeURIComponent(passwordTarget.id)}/password`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: newPassword }),
        }
      );
      if (!res.ok) {
        toast.error(await readError(res));
        return;
      }
      toast.success("Contraseña actualizada");
      setPasswordTarget(null);
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSavingPassword(false);
    }
  }

  function openUnlink(user: User) {
    setUnlinkTarget(user);
    setUnlinkQuery("");
    setSelectedUnlinkIds([]);
  }

  const filteredUnlinkAccounts = useMemo(() => {
    if (!unlinkTarget?.accounts) return [];
    const raw = unlinkQuery.trim().toLowerCase();
    if (!raw) return unlinkTarget.accounts;
    const terms = raw
      .split(/[\n,;]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    if (terms.length === 0) return unlinkTarget.accounts;
    return unlinkTarget.accounts.filter((a) =>
      terms.some((t) => a.email.toLowerCase().includes(t))
    );
  }, [unlinkTarget, unlinkQuery]);

  function selectAllUnlink() {
    const ids = filteredUnlinkAccounts.map((a) => a.id);
    setSelectedUnlinkIds((prev) => {
      const allSelected = ids.every((id) => prev.includes(id));
      if (allSelected) return prev.filter((id) => !ids.includes(id));
      return [...new Set([...prev, ...ids])];
    });
  }

  function toggleUnlink(id: string) {
    setSelectedUnlinkIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleUnlink(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!unlinkTarget) return;
    if (selectedUnlinkIds.length === 0) {
      toast.error("Selecciona al menos una cuenta");
      return;
    }

    setUnlinking(true);
    try {
      const res = await fetch("/api/upstream/accounts/unlink-user", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: unlinkTarget.id,
          account_ids: selectedUnlinkIds,
        }),
      });
      if (!res.ok) {
        toast.error(await readError(res));
        return;
      }
      toast.success("Cuentas desvinculadas correctamente");
      setUsers((prev) =>
        prev.map((u) =>
          u.id === unlinkTarget.id
            ? {
                ...u,
                accounts: u.accounts?.filter(
                  (a) => !selectedUnlinkIds.includes(a.id)
                ),
              }
            : u
        )
      );
      setUnlinkTarget(null);
    } catch {
      toast.error("Error de conexión");
    } finally {
      setUnlinking(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Usuarios
          </h1>
          <p className="mt-1.5 text-sm text-white/35">
            Administra los usuarios con acceso al panel.
          </p>
        </div>
        <button type="button" onClick={openCreate} className={BTN_ACCENT}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden
            className="size-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          Crear usuario
        </button>
      </div>

      <div className={`overflow-hidden ${CARD}`}>
        <div className="flex flex-col gap-3 border-b border-white/[0.06] px-4 py-3.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-2xl">
            <div className="relative w-full sm:max-w-xs">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-white/25">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  aria-hidden
                  className="size-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                  />
                </svg>
              </span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por correo o número…"
                className={`${INPUT_CLASS} pl-9`}
              />
            </div>
            <div className="relative w-full sm:max-w-xs">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-white/25">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  aria-hidden
                  className="size-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"
                  />
                </svg>
              </span>
              <input
                type="search"
                value={accountEmailQuery}
                onChange={(e) => setAccountEmailQuery(e.target.value)}
                placeholder="Buscar por cuenta vinculada…"
                className={`${INPUT_CLASS} pl-9`}
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value as "" | UserRole);
                setSkip(0);
              }}
              aria-label="Filtrar por rol"
              className={`${INPUT_CLASS} cursor-pointer sm:w-44`}
            >
              <option value="">Todos los roles</option>
              {ASSIGNABLE_ROLES.map((role) => (
                <option key={role} value={role}>
                  {roleLabel(role)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[0.75rem] text-white/20">
              {total === 0
                ? "Sin resultados"
                : `${rangeStart}–${rangeEnd} de ${total.toLocaleString("es-CO")}`}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={goPrev}
                disabled={!canPrev}
                className={PAGER}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  aria-hidden
                  className="size-3.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 19.5 8.25 12l7.5-7.5"
                  />
                </svg>
                Anterior
              </button>
              <span className="px-1 text-[0.75rem] font-medium text-white/25">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={goNext}
                disabled={!canNext}
                className={PAGER}
              >
                Siguiente
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  aria-hidden
                  className="size-3.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m8.25 4.5 7.5 7.5-7.5 7.5"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-white/[0.06]">
              <tr className="bg-white/[0.03]">
                <th className={TH}>Usuario / Rol / Cuentas vinculadas</th>
                <th className={`w-80 ${TH} text-right`}>Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading && users.length === 0 && <SkeletonRows />}

              {!loading && errorMsg && (
                <tr>
                  <td colSpan={2} className="px-4 py-12 text-center">
                    <p className="text-sm text-red-300/80">{errorMsg}</p>
                    <button
                      type="button"
                      onClick={reload}
                      className={`mt-4 ${BTN_NEUTRAL}`}
                    >
                      Reintentar
                    </button>
                  </td>
                </tr>
              )}

              {!loading && !errorMsg && users.length === 0 && (
                <tr>
                  <td
                    colSpan={2}
                    className="px-4 py-12 text-center text-sm text-white/20"
                  >
                    {!debouncedQuery && !debouncedAccountEmail && !roleFilter
                      ? "Todavía no hay usuarios. Crea el primero."
                      : "Ningún usuario coincide con la búsqueda."}
                  </td>
                </tr>
              )}

              {!errorMsg &&
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#ff0055]/[0.08] text-[0.75rem] font-bold uppercase text-[#ff0055] ring-1 ring-[#ff0055]/15">
                          {displayName(user)[0] ?? "?"}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-white/75">
                              {displayName(user)}
                            </span>
                            <RoleBadge role={user.role} />
                            {user.email && (
                              <PhoneBadge phone={user.phone_number} />
                            )}
                          </div>
                          {user.role === "advisor" && (
                            <p className="mt-1 text-[0.75rem] text-white/25">
                              Consulta códigos de cualquier correo.
                            </p>
                          )}
                          {user.accounts && user.accounts.length > 0 && (
                            <ul className="mt-1.5 space-y-1">
                              {user.accounts.map((acc) => (
                                <li
                                  key={acc.id}
                                  className="flex flex-wrap items-center gap-1.5 font-mono text-[0.75rem] text-white/35"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 16 16"
                                    fill="currentColor"
                                    aria-hidden
                                    className="size-3 shrink-0 text-white/20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  {acc.email}
                                  <ExpiryTag account={acc} />
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openRole(user)}
                          className={ROW_ACTION}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            aria-hidden
                            className="size-3.5"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                            />
                          </svg>
                          Cambiar rol
                        </button>
                        <button
                          type="button"
                          onClick={() => openPhone(user)}
                          className={ROW_ACTION}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            aria-hidden
                            className="size-3.5"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
                            />
                          </svg>
                          {user.phone_number ? "Cambiar número" : "Asignar número"}
                        </button>
                        {user.role === "reseller" &&
                          user.accounts &&
                          user.accounts.length > 0 && (
                            <button
                              type="button"
                              onClick={() => openRenew(user)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/[0.08] px-2.5 py-1.5 text-[0.7rem] font-medium text-emerald-300/80 ring-1 ring-emerald-500/20 transition hover:bg-emerald-500/[0.14] hover:text-emerald-300"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                                aria-hidden
                                className="size-3.5"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                                />
                              </svg>
                              Renovar 30 días
                            </button>
                          )}
                        {user.accounts && user.accounts.length > 0 && (
                          <button
                            type="button"
                            onClick={() => openUnlink(user)}
                            className={ROW_ACTION}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              aria-hidden
                              className="size-3.5"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M13.181 8.68a4.503 4.503 0 0 1 1.903 6.405m-9.768-2.782L3.56 14.06a4.5 4.5 0 0 0 6.364 6.365l3.129-3.129m5.614-5.615 1.757-1.757a4.5 4.5 0 0 0-6.364-6.365l-4.5 4.5c-.258.26-.479.541-.661.84m1.903 1.903L9.75 15"
                              />
                            </svg>
                            Desvincular cuentas
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openPassword(user)}
                          className={ROW_ACTION}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            aria-hidden
                            className="size-3.5"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z"
                            />
                          </svg>
                          Cambiar contraseña
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(user)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-2.5 py-1.5 text-[0.7rem] font-medium text-white/50 ring-1 ring-white/[0.07] transition hover:bg-red-500/[0.1] hover:text-red-400 hover:ring-red-500/25"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            aria-hidden
                            className="size-3.5"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                            />
                          </svg>
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Crear usuario */}
      {createOpen && (
        <Modal
          onClose={() => (!creating ? setCreateOpen(false) : undefined)}
          title="Crear usuario"
        >
          <form onSubmit={handleCreate} className="space-y-4">
            <p className="text-[0.75rem] text-white/35">
              Indica al menos un correo o un número de teléfono. Cualquiera de
              los dos servirá para iniciar sesión.
            </p>
            <label className="block">
              <span className={LABEL_CLASS}>Correo (opcional)</span>
              <input
                type="email"
                autoFocus
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                placeholder="usuario@correo.com"
                className={INPUT_CLASS}
              />
            </label>
            <div>
              <span className={LABEL_CLASS}>Número (opcional)</span>
              <PhoneNumberField
                value={createPhone}
                onChange={setCreatePhone}
                className={PHONE_FIELD_CLASS}
              />
              <span className="mt-1 block text-[0.7rem] text-white/25">
                {PHONE_HINT}
              </span>
            </div>
            <label className="block">
              <span className={LABEL_CLASS}>Contraseña</span>
              <input
                type="password"
                required
                minLength={6}
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                placeholder="••••••••"
                className={INPUT_CLASS}
              />
            </label>

            <div>
              <span className={LABEL_CLASS}>Rol</span>
              <RoleOptions value={createRole} onChange={setCreateRole} />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                disabled={creating}
                className={BTN_GHOST}
              >
                Cancelar
              </button>
              <button type="submit" disabled={creating} className={BTN_ACCENT}>
                {creating ? "Creando…" : "Crear usuario"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Asignar número */}
      {phoneTarget && (
        <Modal
          onClose={() => (!savingPhone ? setPhoneTarget(null) : undefined)}
          title={phoneTarget.phone_number ? "Cambiar número" : "Asignar número"}
        >
          <form onSubmit={handleUpdatePhone} className="space-y-4">
            <p className="text-sm text-white/40">
              Usuario:{" "}
              <span className="font-medium text-white/80">
                {displayName(phoneTarget)}
              </span>
            </p>

            <div>
              <span className={LABEL_CLASS}>Número</span>
              <PhoneNumberField
                value={nextPhone}
                onChange={setNextPhone}
                className={PHONE_FIELD_CLASS}
                autoFocus
              />
              <span className="mt-1 block text-[0.7rem] text-white/25">
                {PHONE_HINT}
              </span>
            </div>

            {phoneTarget.email ? (
              <p className="text-[0.75rem] text-white/25">
                Con este número el usuario podrá iniciar sesión con su misma
                contraseña. Déjalo vacío para quitarlo y que solo entre con correo.
              </p>
            ) : (
              <p className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3.5 py-2.5 text-[0.75rem] text-amber-200/80">
                Este usuario no tiene correo, por lo que puedes cambiar su número,
                pero no eliminarlo.
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPhoneTarget(null)}
                disabled={savingPhone}
                className={BTN_GHOST}
              >
                Cancelar
              </button>
              <button type="submit" disabled={savingPhone} className={BTN_ACCENT}>
                {savingPhone ? "Guardando…" : "Guardar número"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Cambiar rol */}
      {roleTarget && (
        <Modal
          onClose={() => (!savingRole ? setRoleTarget(null) : undefined)}
          title="Cambiar rol"
        >
          <form onSubmit={handleUpdateRole} className="space-y-4">
            <p className="text-sm text-white/40">
              Usuario:{" "}
              <span className="font-medium text-white/80">
                {displayName(roleTarget)}
              </span>
              {roleTarget.role && (
                <>
                  {" "}
                  · rol actual:{" "}
                  <span className="font-medium text-white/80">
                    {roleLabel(roleTarget.role)}
                  </span>
                </>
              )}
            </p>

            <RoleOptions value={nextRole} onChange={setNextRole} />

            {nextRole === "reseller" && roleTarget.role === "advisor" && (
              <p className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3.5 py-2.5 text-[0.75rem] text-amber-200/80">
                Al pasar a revendedor solo podrá consultar las cuentas que tenga
                asignadas, y esas asignaciones vencerán en 30 días.
              </p>
            )}
            {nextRole === "advisor" && roleTarget.role === "reseller" && (
              <p className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3.5 py-2.5 text-[0.75rem] text-amber-200/80">
                Como asesor podrá consultar códigos de cualquier correo, sin
                vencimiento.
              </p>
            )}

            <p className="text-[0.75rem] text-white/25">
              Al cambiar el rol se cerrarán las sesiones activas del usuario.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRoleTarget(null)}
                disabled={savingRole}
                className={BTN_GHOST}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingRole || nextRole === roleTarget.role}
                className={BTN_ACCENT}
              >
                {savingRole ? "Guardando…" : "Guardar rol"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Renovar acceso */}
      {renewTarget && (
        <Modal
          onClose={() => (!renewing ? setRenewTarget(null) : undefined)}
          title="Renovar acceso 30 días"
        >
          <form onSubmit={handleRenew} className="space-y-4">
            <p className="text-sm text-white/40">
              Revendedor:{" "}
              <span className="font-medium text-white/80">
                {displayName(renewTarget)}
              </span>
            </p>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className={`${LABEL_CLASS} mb-0`}>Cuentas a renovar</span>
                <span className="text-[0.75rem] text-white/25">
                  {selectedRenewIds.length} de {renewTarget.accounts?.length ?? 0}
                </span>
              </div>

              <div className="max-h-48 space-y-0.5 overflow-y-auto rounded-xl border border-white/[0.06] bg-white/[0.02] p-2">
                {(renewTarget.accounts ?? []).map((acc) => (
                  <label
                    key={acc.id}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-[0.8rem] text-white/70 transition hover:bg-white/[0.04] hover:text-white"
                  >
                    <input
                      type="checkbox"
                      checked={selectedRenewIds.includes(acc.id)}
                      onChange={() => toggleRenew(acc.id)}
                      className="size-4 rounded border-white/20 bg-white/[0.03] accent-[#ff0055]"
                    />
                    <span className="min-w-0 flex-1 truncate">{acc.email}</span>
                    <ExpiryTag account={acc} />
                  </label>
                ))}
              </div>
            </div>

            <p className="text-[0.75rem] text-white/25">
              La vigencia se reinicia: vencerán 30 días después de hoy.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRenewTarget(null)}
                disabled={renewing}
                className={BTN_GHOST}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={renewing || selectedRenewIds.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500/[0.1] px-4 py-2 text-[0.75rem] font-medium tracking-wide text-emerald-300 ring-1 ring-emerald-500/30 transition hover:bg-emerald-500/20 hover:ring-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {renewing ? "Renovando…" : "Renovar 30 días"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Eliminar usuario */}
      {confirmDelete && (
        <Modal
          onClose={() => (!deletingId ? setConfirmDelete(null) : undefined)}
          title="Eliminar usuario"
        >
          <p className="text-sm text-white/50">
            ¿Seguro que deseas eliminar el usuario{" "}
            <span className="font-medium text-white/80">
              {displayName(confirmDelete)}
            </span>
            ? Esta acción no se puede deshacer.
          </p>
          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setConfirmDelete(null)}
              disabled={deletingId !== null}
              className={BTN_GHOST}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleDelete(confirmDelete)}
              disabled={deletingId !== null}
              className={BTN_DANGER}
            >
              {deletingId !== null ? "Eliminando…" : "Sí, eliminar"}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal: Cambiar contraseña */}
      {passwordTarget && (
        <Modal
          onClose={() => (!savingPassword ? setPasswordTarget(null) : undefined)}
          title="Asignar nueva contraseña"
        >
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <p className="text-sm text-white/40">
              Usuario:{" "}
              <span className="font-medium text-white/80">
                {displayName(passwordTarget)}
              </span>
            </p>

            <label className="block">
              <span className={LABEL_CLASS}>Nueva contraseña</span>
              <input
                type={showPassword ? "text" : "password"}
                required
                autoFocus
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className={INPUT_CLASS}
              />
            </label>

            <label className="block">
              <span className={LABEL_CLASS}>Confirmar contraseña</span>
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className={INPUT_CLASS}
              />
            </label>

            <label className="flex cursor-pointer items-center gap-2.5 text-[0.75rem] text-white/40 transition hover:text-white/70">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                className="size-4 rounded border-white/20 bg-white/[0.03] accent-[#ff0055]"
              />
              Mostrar contraseñas
            </label>

            <p className="text-[0.75rem] text-white/25">
              Al cambiar la contraseña se cerrarán las sesiones activas del
              usuario.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPasswordTarget(null)}
                disabled={savingPassword}
                className={BTN_GHOST}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingPassword}
                className={BTN_ACCENT}
              >
                {savingPassword ? "Guardando…" : "Guardar contraseña"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Desvincular cuentas */}
      {unlinkTarget && (
        <Modal
          onClose={() => (!unlinking ? setUnlinkTarget(null) : undefined)}
          title="Desvincular cuentas"
        >
          <form onSubmit={handleUnlink} className="space-y-4">
            <p className="text-sm text-white/40">
              Usuario:{" "}
              <span className="font-medium text-white/80">
                {displayName(unlinkTarget)}
              </span>
            </p>

            <div>
              <span className={LABEL_CLASS}>Cuentas vinculadas</span>
              <div className="relative mb-2.5">
                <textarea
                  value={unlinkQuery}
                  onChange={(e) => setUnlinkQuery(e.target.value)}
                  placeholder="Pegar cuentas (una por línea, separadas por coma o punto y coma)…"
                  rows={3}
                  className={`${INPUT_CLASS} resize-none`}
                />
              </div>

              <div className="mb-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={selectAllUnlink}
                  className="rounded-lg bg-white/[0.04] px-2.5 py-1.5 text-[0.7rem] font-medium text-white/50 ring-1 ring-white/[0.07] transition hover:bg-white/[0.08] hover:text-white"
                >
                  {filteredUnlinkAccounts.length > 0 &&
                  filteredUnlinkAccounts.every((a) =>
                    selectedUnlinkIds.includes(a.id)
                  )
                    ? "Deseleccionar todas"
                    : "Seleccionar todas"}
                </button>
                {selectedUnlinkIds.length > 0 && (
                  <span className="text-[0.75rem] text-white/25">
                    {selectedUnlinkIds.length} cuenta(s) seleccionada(s)
                  </span>
                )}
              </div>

              {filteredUnlinkAccounts.length === 0 ? (
                <p className="py-6 text-center text-sm text-white/20">
                  No hay cuentas vinculadas.
                </p>
              ) : (
                <div className="max-h-48 space-y-0.5 overflow-y-auto rounded-xl border border-white/[0.06] bg-white/[0.02] p-2">
                  {filteredUnlinkAccounts.map((acc) => (
                    <label
                      key={acc.id}
                      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-[0.8rem] text-white/70 transition hover:bg-white/[0.04] hover:text-white"
                    >
                      <input
                        type="checkbox"
                        checked={selectedUnlinkIds.includes(acc.id)}
                        onChange={() => toggleUnlink(acc.id)}
                        className="size-4 rounded border-white/20 bg-white/[0.03] accent-[#ff0055]"
                      />
                      {acc.email}
                    </label>
                  ))}
                </div>
              )}

            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setUnlinkTarget(null)}
                disabled={unlinking}
                className={BTN_GHOST}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={unlinking || selectedUnlinkIds.length === 0}
                className={BTN_DANGER}
              >
                {unlinking ? "Desvinculando…" : "Desvincular"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function RoleBadge({ role }: { role?: UserRole }) {
  if (!role) return null;
  const styles =
    role === "advisor"
      ? "bg-sky-500/[0.08] text-sky-300/80 ring-sky-500/15"
      : "bg-fuchsia-500/[0.08] text-fuchsia-300/80 ring-fuchsia-500/15";
  return (
    <span
      className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[0.7rem] font-medium ring-1 ring-inset ${styles}`}
    >
      {roleLabel(role)}
    </span>
  );
}

function PhoneBadge({ phone }: { phone?: string | null }) {
  if (!phone) return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/[0.08] px-2 py-0.5 font-mono text-[0.7rem] font-medium text-emerald-300/80 ring-1 ring-inset ring-emerald-500/15"
      title="También inicia sesión con este número"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        fill="currentColor"
        aria-hidden
        className="size-3"
      >
        <path d="M5.5 1.5h5A1.5 1.5 0 0 1 12 3v10a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 4 13V3a1.5 1.5 0 0 1 1.5-1.5Zm1 10.25a.75.75 0 1 0 0 1.5h3a.75.75 0 0 0 0-1.5h-3Z" />
      </svg>
      {formatPhoneNumber(phone)}
    </span>
  );
}

function ExpiryTag({ account }: { account: Account }) {
  if (!account.expires_at) return null;

  if (account.is_expired) {
    return (
      <span className="inline-flex items-center rounded-lg bg-red-500/[0.08] px-1.5 py-0.5 text-[0.7rem] font-medium text-red-300/80 ring-1 ring-inset ring-red-500/15">
        vencido
      </span>
    );
  }

  const days = daysUntilExpiry(account.expires_at);
  const urgent = days !== null && days <= 5;
  return (
    <span
      className={`inline-flex items-center rounded-lg px-1.5 py-0.5 text-[0.7rem] font-medium ring-1 ring-inset ${
        urgent
          ? "bg-amber-500/[0.08] text-amber-200/80 ring-amber-500/15"
          : "bg-white/[0.04] text-white/40 ring-white/[0.07]"
      }`}
      title={`Vence el ${formatExpiry(account.expires_at)}`}
    >
      {days !== null && days <= 30
        ? `${days} día${days === 1 ? "" : "s"}`
        : `vence ${formatExpiry(account.expires_at)}`}
    </span>
  );
}

function RoleOptions({
  value,
  onChange,
}: {
  value: UserRole;
  onChange: (role: UserRole) => void;
}) {
  return (
    <div className="space-y-2">
      {ASSIGNABLE_ROLES.map((role) => (
        <label
          key={role}
          className={`flex cursor-pointer gap-3 rounded-xl border p-3.5 transition ${
            value === role
              ? "border-[#ff0055]/30 bg-[#ff0055]/[0.06]"
              : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
          }`}
        >
          <input
            type="radio"
            name="role"
            value={role}
            checked={value === role}
            onChange={() => onChange(role)}
            className="mt-0.5 size-4 border-white/20 bg-white/[0.03] accent-[#ff0055]"
          />
          <span className="min-w-0">
            <span className="block text-[0.8rem] font-medium text-white/80">
              {roleLabel(role)}
            </span>
            <span className="mt-0.5 block text-[0.75rem] text-white/30">
              {ROLE_DESCRIPTIONS[role]}
            </span>
          </span>
        </label>
      ))}
    </div>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <tr key={i}>
          <td className="px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="size-8 animate-pulse rounded-lg bg-white/[0.04]" />
              <div className="space-y-1.5">
                <div className="h-3 w-40 animate-pulse rounded bg-white/[0.04]" />
                <div className="h-2.5 w-32 animate-pulse rounded bg-white/[0.04]" />
              </div>
            </div>
          </td>
          <td className="px-4 py-4">
            <div className="ml-auto h-7 w-36 animate-pulse rounded bg-white/[0.04]" />
          </td>
        </tr>
      ))}
    </>
  );
}
