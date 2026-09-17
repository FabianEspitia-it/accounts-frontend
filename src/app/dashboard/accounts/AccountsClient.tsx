"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";

import { formatPhoneNumber } from "@/components/PhoneNumberField";
import { UserRole, roleLabel } from "@/lib/roles";
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

type Account = {
  id: string;
  email: string;
};

type AccountsResponse = {
  total: number;
  skip: number;
  limit: number;
  accounts: Account[];
};

type User = {
  id: string;
  email?: string | null;
  phone_number?: string | null;
  role?: UserRole;
};

function displayUser(user: User): string {
  if (user.email) return user.email;
  if (user.phone_number) return formatPhoneNumber(user.phone_number);
  return "—";
}

const PAGE_SIZE = 25;

async function readError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.error === "string") return data.error;
    if (typeof data?.detail === "string") return data.detail;
    if (Array.isArray(data?.detail) && data.detail[0]?.msg) {
      return String(data.detail[0].msg);
    }
  } catch {
    /* fallthrough */
  }
  return `Error ${res.status}`;
}

export default function AccountsClient() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkUploading, setBulkUploading] = useState(false);

  const [editTarget, setEditTarget] = useState<Account | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<Account | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [linkOpen, setLinkOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [accountEmailsText, setAccountEmailsText] = useState("");
  const [selectedAccounts, setSelectedAccounts] = useState<Account[]>([]);
  const [notFoundEmails, setNotFoundEmails] = useState<string[]>([]);
  const [resolvingAccounts, setResolvingAccounts] = useState(false);
  const [linking, setLinking] = useState(false);
  const userSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setSkip(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  const fetchAccounts = useCallback(
    async (currentSkip: number, emailFilter: string, signal: AbortSignal) => {
      const params = new URLSearchParams();
      params.set("skip", String(currentSkip));
      params.set("limit", String(PAGE_SIZE));
      if (emailFilter) {
        params.set("email", emailFilter);
      }

      const res = await fetch(`/api/upstream/accounts?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
        signal,
      });

      if (!res.ok) {
        const msg = await readError(res);
        throw new Error(msg);
      }

      return (await res.json()) as AccountsResponse;
    },
    []
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setErrorMsg(null);

    (async () => {
      try {
        const data = await fetchAccounts(skip, debouncedQuery, controller.signal);
        setAccounts(Array.isArray(data?.accounts) ? data.accounts : []);
        setTotal(typeof data?.total === "number" ? data.total : 0);
        setErrorMsg(null);
      } catch (err) {
        if (controller.signal.aborted) return;
        const message =
          err instanceof Error ? err.message : "No se pudo conectar con el servidor";
        setErrorMsg(message);
        setAccounts([]);
        setTotal(0);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [skip, debouncedQuery, reloadToken, fetchAccounts]);

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

  function openBulk() {
    setBulkText("");
    setBulkOpen(true);
  }

  async function handleBulkUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const lines = bulkText
      .split(/[\n,;]+/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      toast.error("Ingresa al menos un correo");
      return;
    }

    const payload = { accounts: lines.map((email) => ({ email })) };

    setBulkUploading(true);
    try {
      const res = await fetch("/api/upstream/accounts/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        toast.error(await readError(res));
        return;
      }
      toast.success(`${lines.length} cuenta(s) subidas correctamente`);
      setBulkOpen(false);
      reload();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setBulkUploading(false);
    }
  }

  function openEdit(account: Account) {
    setEditTarget(account);
    setEditEmail(account.email);
  }

  async function handleEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editTarget) return;

    const email = editEmail.trim().toLowerCase();
    if (!email) {
      toast.error("Ingresa un correo válido");
      return;
    }
    if (email === editTarget.email.toLowerCase()) {
      setEditTarget(null);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        `/api/upstream/accounts/${encodeURIComponent(editTarget.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      );
      if (!res.ok) {
        toast.error(await readError(res));
        return;
      }
      const updated = (await res.json()) as Account;
      toast.success("Cuenta actualizada");
      setAccounts((prev) =>
        prev.map((a) =>
          a.id === editTarget.id ? { ...a, email: updated?.email ?? email } : a
        )
      );
      setEditTarget(null);
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(account: Account) {
    setDeletingId(account.id);
    try {
      const res = await fetch(
        `/api/upstream/accounts/${encodeURIComponent(account.id)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        toast.error(await readError(res));
        return;
      }
      toast.success("Cuenta eliminada");
      setConfirmDelete(null);
      setAccounts((prev) => prev.filter((a) => a.id !== account.id));
      setTotal((prev) => Math.max(0, prev - 1));
    } catch {
      toast.error("Error de conexión");
    } finally {
      setDeletingId(null);
    }
  }

  function openLink() {
    setUserQuery("");
    setSelectedUser(null);
    setUsers([]);
    setAccountEmailsText("");
    setSelectedAccounts([]);
    setNotFoundEmails([]);
    setLinkOpen(true);
  }

  function handleUserQueryChange(value: string) {
    setUserQuery(value);
    setSelectedUser(null);
    setUsers([]);

    if (userSearchRef.current) clearTimeout(userSearchRef.current);

    const trimmed = value.trim();
    if (!trimmed) return;

    userSearchRef.current = setTimeout(async () => {
      setLoadingUsers(true);
      try {
        const params = new URLSearchParams({ search: trimmed, limit: "10" });
        const res = await fetch(`/api/upstream/users?${params.toString()}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          setUsers(Array.isArray(data?.users) ? data.users : []);
        }
      } catch {
        /* silent */
      } finally {
        setLoadingUsers(false);
      }
    }, 300);
  }

  async function resolveAccountEmails() {
    const raw = accountEmailsText.trim();
    if (!raw) return;

    const emails = raw
      .split(/[\n,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0);

    const unique = [...new Set(emails)];
    if (unique.length === 0) return;

    setResolvingAccounts(true);
    setNotFoundEmails([]);

    const found: Account[] = [];
    const notFound: string[] = [];

    const batchSize = 5;
    for (let i = 0; i < unique.length; i += batchSize) {
      const batch = unique.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(async (email) => {
          try {
            const params = new URLSearchParams({ email, limit: "1" });
            const res = await fetch(`/api/upstream/accounts?${params.toString()}`, {
              cache: "no-store",
            });
            if (res.ok) {
              const data = await res.json();
              const accounts: Account[] = Array.isArray(data?.accounts) ? data.accounts : [];
              const exact = accounts.find((a) => a.email.toLowerCase() === email);
              if (exact) return { email, account: exact };
            }
          } catch {
            /* silent */
          }
          return { email, account: null };
        })
      );
      for (const r of results) {
        if (r.account) found.push(r.account);
        else notFound.push(r.email);
      }
    }

    setSelectedAccounts((prev) => {
      const existingIds = new Set(prev.map((a) => a.id));
      const newAccounts = found.filter((a) => !existingIds.has(a.id));
      return [...prev, ...newAccounts];
    });
    setNotFoundEmails(notFound);
    if (found.length > 0) {
      setAccountEmailsText("");
    }
    setResolvingAccounts(false);
  }

  const filteredUsers = selectedUser || !userQuery.trim() ? [] : users;

  function selectUser(user: User) {
    setSelectedUser(user);
    setUserQuery(displayUser(user));
  }

  function clearUser() {
    setSelectedUser(null);
    setUserQuery("");
  }

  function removeAccount(id: string) {
    setSelectedAccounts((prev) => prev.filter((a) => a.id !== id));
  }

  async function handleLink(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedUser) {
      toast.error("Selecciona un usuario válido");
      return;
    }
    if (selectedAccounts.length === 0) {
      toast.error("Selecciona al menos una cuenta");
      return;
    }

    setLinking(true);
    try {
      const res = await fetch("/api/upstream/accounts/link-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: selectedUser.id,
          account_ids: selectedAccounts.map((a) => a.id),
        }),
      });
      if (!res.ok) {
        toast.error(await readError(res));
        return;
      }
      const data = await res.json().catch(() => null);
      const created = Array.isArray(data?.created) ? data.created.length : 0;
      const renewed = Array.isArray(data?.renewed) ? data.renewed.length : 0;
      const skipped = Array.isArray(data?.skipped) ? data.skipped.length : 0;

      const parts: string[] = [];
      if (created) parts.push(`${created} vinculada(s)`);
      if (renewed) parts.push(`${renewed} renovada(s)`);
      if (skipped) parts.push(`${skipped} omitida(s)`);

      if (created || renewed) {
        toast.success(parts.join(" · ") || "Cuentas vinculadas correctamente");
      } else {
        toast.info(
          skipped
            ? `Sin cambios: ${skipped} omitida(s) (ya estaban vinculadas)`
            : "Sin cambios"
        );
      }
      setLinkOpen(false);
    } catch {
      toast.error("Error de conexión");
    } finally {
      setLinking(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Cuentas
          </h1>
          <p className="mt-1.5 text-sm text-white/35">
            Administra las cuentas del sistema.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={openBulk} className={BTN_ACCENT}>
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
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
              />
            </svg>
            Subir cuentas
          </button>
          <button type="button" onClick={openLink} className={BTN_NEUTRAL}>
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
                d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m9.86-2.754a4.5 4.5 0 0 0-1.242-7.244l-4.5-4.5a4.5 4.5 0 0 0-6.364 6.364L4.34 8.627"
              />
            </svg>
            Vincular usuario
          </button>
        </div>
      </div>

      <div className={`overflow-hidden ${CARD}`}>
        <div className="flex flex-col gap-3 border-b border-white/[0.06] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
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
              placeholder="Buscar por correo…"
              className={`${INPUT_CLASS} pl-9`}
            />
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
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="border-b border-white/[0.06]">
              <tr className="bg-white/[0.03] light:bg-[var(--ui-thead)]">
                <th className={TH}>Correo</th>
                <th className={`${TH} text-right`}>Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading && accounts.length === 0 && <SkeletonRows />}

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

              {!loading && !errorMsg && accounts.length === 0 && (
                <tr>
                  <td
                    colSpan={2}
                    className="px-4 py-12 text-center text-sm text-white/20"
                  >
                    {debouncedQuery
                      ? "Ninguna cuenta coincide con la búsqueda."
                      : "No hay cuentas registradas. Sube la primera."}
                  </td>
                </tr>
              )}

              {!errorMsg &&
                accounts.map((account) => (
                  <tr
                    key={account.id}
                    className="transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-dash_accent/[0.08] text-[0.75rem] font-bold uppercase text-dash_accent ring-1 ring-dash_accent/15">
                          {account.email?.[0] ?? "?"}
                        </div>
                        <span className="text-white/75">{account.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(account)}
                          className="rounded-lg p-1.5 text-white/25 transition-all duration-200 hover:bg-white/[0.08] hover:text-white/60"
                          aria-label="Editar cuenta"
                          title="Editar cuenta"
                        >
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
                              d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125"
                            />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(account)}
                          className="rounded-lg p-1.5 text-white/25 transition-all duration-200 hover:bg-red-500/[0.08] hover:text-red-400"
                          aria-label="Eliminar cuenta"
                          title="Eliminar cuenta"
                        >
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
                              d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Subir cuentas masivamente */}
      {bulkOpen && (
        <Modal
          onClose={() => (!bulkUploading ? setBulkOpen(false) : undefined)}
          title="Subir cuentas masivamente"
        >
          <form onSubmit={handleBulkUpload} className="space-y-4">
            <label className="block">
              <span className={LABEL_CLASS}>
                Correos (uno por línea o separados por comas)
              </span>
              <textarea
                required
                autoFocus
                rows={6}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={"cuenta1@example.com\ncuenta2@example.com\ncuenta3@example.com"}
                className={`${INPUT_CLASS} resize-y`}
              />
            </label>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setBulkOpen(false)}
                disabled={bulkUploading}
                className={BTN_GHOST}
              >
                Cancelar
              </button>
              <button type="submit" disabled={bulkUploading} className={BTN_ACCENT}>
                {bulkUploading ? "Subiendo…" : "Subir cuentas"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Editar cuenta */}
      {editTarget && (
        <Modal
          onClose={() => (!saving ? setEditTarget(null) : undefined)}
          title="Editar cuenta"
        >
          <form onSubmit={handleEdit} className="space-y-4">
            <label className="block">
              <span className={LABEL_CLASS}>Correo</span>
              <input
                type="email"
                required
                autoFocus
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="cuenta@correo.com"
                className={INPUT_CLASS}
              />
            </label>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                disabled={saving}
                className={BTN_GHOST}
              >
                Cancelar
              </button>
              <button type="submit" disabled={saving} className={BTN_ACCENT}>
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Eliminar cuenta */}
      {confirmDelete && (
        <Modal
          onClose={() => (!deletingId ? setConfirmDelete(null) : undefined)}
          title="Eliminar cuenta"
        >
          <p className="text-sm text-white/50">
            ¿Seguro que deseas eliminar la cuenta{" "}
            <span className="font-medium text-white/80">
              {confirmDelete.email}
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

      {/* Modal: Vincular usuario con cuentas */}
      {linkOpen && (
        <Modal
          onClose={() => (!linking ? setLinkOpen(false) : undefined)}
          title="Vincular usuario con cuentas"
          size="lg"
        >
          <form onSubmit={handleLink} className="space-y-4">
            <div className="relative">
              <span className={LABEL_CLASS}>Correo o número del usuario</span>
              {selectedUser ? (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-dash_accent/25 bg-dash_accent/[0.06] px-3.5 py-2">
                  <span className="flex flex-wrap items-center gap-2 text-[0.8rem] text-white/80">
                    {displayUser(selectedUser)}
                    {selectedUser.role && (
                      <span className="inline-flex items-center rounded-lg bg-white/[0.05] px-2 py-0.5 text-[0.7rem] font-medium text-white/50 ring-1 ring-inset ring-white/[0.08]">
                        {roleLabel(selectedUser.role)}
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={clearUser}
                    className="shrink-0 rounded-lg p-1 text-white/30 transition hover:bg-white/[0.06] hover:text-white/60"
                    aria-label="Quitar usuario"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden className="size-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    autoFocus
                    value={userQuery}
                    onChange={(e) => handleUserQueryChange(e.target.value)}
                    placeholder="Escribe el correo o número del usuario"
                    className={`${INPUT_CLASS} pr-9`}
                  />
                  {loadingUsers && (
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                      <svg className="size-4 animate-spin text-dash_accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                      </svg>
                    </span>
                  )}
                </div>
              )}
              {filteredUsers.length > 0 && (
                <div className="absolute z-10 mt-1.5 max-h-40 w-full animate-slide-down overflow-y-auto rounded-xl border border-white/[0.08] bg-dash_panel shadow-2xl">
                  {filteredUsers.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => selectUser(u)}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[0.8rem] text-white/70 transition hover:bg-white/[0.04] hover:text-white"
                    >
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-dash_accent/[0.08] text-[0.7rem] font-bold uppercase text-dash_accent ring-1 ring-dash_accent/15">
                        {displayUser(u)[0] ?? "?"}
                      </div>
                      <span className="min-w-0">
                        <span className="block truncate">{displayUser(u)}</span>
                        {u.email && u.phone_number && (
                          <span className="block font-mono text-[0.7rem] text-white/30">
                            {formatPhoneNumber(u.phone_number)}
                          </span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {userQuery.trim() && !selectedUser && filteredUsers.length === 0 && !loadingUsers && (
                <p className="mt-1.5 text-[0.75rem] text-white/20">No se encontró ningún usuario con ese correo o número.</p>
              )}
              {selectedUser?.role === "reseller" && (
                <p className="mt-1.5 text-[0.75rem] text-amber-200/70">
                  Es revendedor: el acceso a estas cuentas vencerá en 30 días.
                </p>
              )}
              {selectedUser?.role === "advisor" && (
                <p className="mt-1.5 text-[0.75rem] text-sky-200/70">
                  Es asesor: ya puede consultar cualquier correo, vincular
                  cuentas no es necesario.
                </p>
              )}
            </div>

            <div>
              <span className={LABEL_CLASS}>Correos de las cuentas</span>
              <textarea
                value={accountEmailsText}
                onChange={(e) => setAccountEmailsText(e.target.value)}
                placeholder={"Pega los correos de las cuentas separados por comas o saltos de línea\nej: cuenta1@correo.com, cuenta2@correo.com"}
                rows={4}
                className={`${INPUT_CLASS} resize-none`}
              />
              <button
                type="button"
                onClick={resolveAccountEmails}
                disabled={resolvingAccounts || !accountEmailsText.trim()}
                className={`mt-2.5 w-full ${BTN_NEUTRAL}`}
              >
                {resolvingAccounts ? "Buscando cuentas…" : "Buscar cuentas"}
              </button>
              {notFoundEmails.length > 0 && (
                <div className="mt-2.5 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-3.5 py-2.5">
                  <span className="block text-[0.7rem] font-bold uppercase tracking-[0.1em] text-red-300/70">
                    No se encontraron ({notFoundEmails.length})
                  </span>
                  <p className="mt-1 break-all text-[0.75rem] text-red-200/70">
                    {notFoundEmails.join(", ")}
                  </p>
                </div>
              )}
            </div>

            {selectedAccounts.length > 0 && (
              <div>
                <span className={LABEL_CLASS}>
                  Cuentas seleccionadas ({selectedAccounts.length})
                </span>
                <div className="flex flex-wrap gap-2">
                  {selectedAccounts.map((acc) => (
                    <span
                      key={acc.id}
                      className="inline-flex items-center gap-1 rounded-lg bg-dash_accent/[0.08] px-2.5 py-1 text-[0.75rem] font-medium text-dash_accent ring-1 ring-inset ring-dash_accent/20"
                    >
                      {acc.email}
                      <button
                        type="button"
                        onClick={() => removeAccount(acc.id)}
                        className="ml-0.5 rounded p-0.5 text-dash_accent/60 transition hover:text-dash_accent"
                        aria-label={`Quitar ${acc.email}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden className="size-3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setLinkOpen(false)}
                disabled={linking}
                className={BTN_GHOST}
              >
                Cancelar
              </button>
              <button type="submit" disabled={linking} className={BTN_ACCENT}>
                {linking ? "Vinculando…" : "Vincular"}
              </button>
            </div>
          </form>
        </Modal>
      )}
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
              <div className="h-3 w-40 animate-pulse rounded bg-white/[0.04]" />
            </div>
          </td>
          <td className="px-4 py-4">
            <div className="ml-auto h-3 w-20 animate-pulse rounded bg-white/[0.04]" />
          </td>
        </tr>
      ))}
    </>
  );
}
