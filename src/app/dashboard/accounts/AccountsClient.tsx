"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";

import { UserRole, roleLabel } from "@/lib/roles";

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
  email: string;
  role?: UserRole;
};

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
        const params = new URLSearchParams({ email: trimmed, limit: "10" });
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
    setUserQuery(user.email);
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
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white md:text-3xl">
            Cuentas
          </h2>
          <p className="mt-1 text-sm text-white/70">
            Administra las cuentas del sistema.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={openBulk}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-premium_pink px-4 py-2.5 text-sm font-semibold text-panel_black transition hover:opacity-90"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
              />
            </svg>
            Subir cuentas
          </button>
          <button
            type="button"
            onClick={openLink}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-premium_pink/30 px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-premium_pink/10"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-4 w-4"
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

      <div className="overflow-hidden rounded-2xl border border-premium_pink/20 bg-panel_black">
        <div className="flex flex-col gap-3 border-b border-premium_pink/20 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-premium_pink/70">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
                className="h-4 w-4"
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
              placeholder="Buscar por correo"
              className="w-full rounded-lg border border-premium_pink/30 bg-panel_black py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/40 focus:border-premium_pink focus:outline-none focus:ring-1 focus:ring-premium_pink"
            />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-white/60">
              {total === 0 ? "Sin resultados" : `Mostrando ${rangeStart}–${rangeEnd} de ${total.toLocaleString("es-CO")}`}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goPrev}
                disabled={!canPrev}
                className="inline-flex items-center gap-1 rounded-lg border border-premium_pink/30 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-premium_pink/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="h-4 w-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 19.5 8.25 12l7.5-7.5"
                  />
                </svg>
                Anterior
              </button>
              <span className="text-xs text-white/50">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={goNext}
                disabled={!canNext}
                className="inline-flex items-center gap-1 rounded-lg border border-premium_pink/30 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-premium_pink/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="h-4 w-4"
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
            <thead className="bg-premium_pink/5 text-xs uppercase tracking-wide text-premium_pink/80">
              <tr>
                <th className="px-4 py-3 font-semibold">Correo</th>
                <th className="px-4 py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-premium_pink/10">
              {loading && accounts.length === 0 && <SkeletonRows />}

              {!loading && errorMsg && (
                <tr>
                  <td colSpan={2} className="px-4 py-10 text-center">
                    <p className="text-sm text-red-300">{errorMsg}</p>
                    <button
                      type="button"
                      onClick={reload}
                      className="mt-3 rounded-lg border border-premium_pink/30 px-3 py-1.5 text-xs text-premium_pink hover:bg-premium_pink/10"
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
                    className="px-4 py-10 text-center text-sm text-white/60"
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
                    className="transition hover:bg-premium_pink/5"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-premium_pink/15 text-sm font-semibold uppercase text-premium_pink">
                          {account.email?.[0] ?? "?"}
                        </div>
                        <span className="font-medium text-white">
                          {account.email}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(account)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-premium_pink/30 px-3 py-1.5 text-xs font-medium text-premium_pink transition hover:bg-premium_pink/10"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.8}
                            stroke="currentColor"
                            className="h-4 w-4"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125"
                            />
                          </svg>
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(account)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/30 px-3 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-500/10"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.8}
                            stroke="currentColor"
                            className="h-4 w-4"
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

      {/* Modal: Subir cuentas masivamente */}
      {bulkOpen && (
        <Modal
          onClose={() => (!bulkUploading ? setBulkOpen(false) : undefined)}
          title="Subir cuentas masivamente"
        >
          <form onSubmit={handleBulkUpload} className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-premium_pink">
                Correos (uno por línea o separados por comas)
              </span>
              <textarea
                required
                autoFocus
                rows={6}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={"cuenta1@example.com\ncuenta2@example.com\ncuenta3@example.com"}
                className="w-full rounded-lg border border-premium_pink/30 bg-panel_black px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-premium_pink focus:outline-none focus:ring-1 focus:ring-premium_pink"
              />
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBulkOpen(false)}
                disabled={bulkUploading}
                className="rounded-lg border border-premium_pink/30 px-4 py-2 text-sm font-medium text-white/80 hover:bg-premium_pink/10 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={bulkUploading}
                className="rounded-lg bg-premium_pink px-4 py-2 text-sm font-semibold text-panel_black transition hover:opacity-90 disabled:opacity-60"
              >
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
              <span className="mb-1 block text-xs font-medium text-premium_pink">
                Correo
              </span>
              <input
                type="email"
                required
                autoFocus
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="cuenta@correo.com"
                className="w-full rounded-lg border border-premium_pink/30 bg-panel_black px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-premium_pink focus:outline-none focus:ring-1 focus:ring-premium_pink"
              />
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                disabled={saving}
                className="rounded-lg border border-premium_pink/30 px-4 py-2 text-sm font-medium text-white/80 hover:bg-premium_pink/10 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-premium_pink px-4 py-2 text-sm font-semibold text-panel_black transition hover:opacity-90 disabled:opacity-60"
              >
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
          <p className="text-sm text-white/80">
            ¿Seguro que deseas eliminar la cuenta{" "}
            <span className="font-semibold text-white">
              {confirmDelete.email}
            </span>
            ? Esta acción no se puede deshacer.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmDelete(null)}
              disabled={deletingId !== null}
              className="rounded-lg border border-premium_pink/30 px-4 py-2 text-sm font-medium text-white/80 hover:bg-premium_pink/10 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleDelete(confirmDelete)}
              disabled={deletingId !== null}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-60"
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
        >
          <form onSubmit={handleLink} className="space-y-4">
            <div className="relative">
              <span className="mb-1 block text-xs font-medium text-premium_pink">
                Correo del usuario
              </span>
              {selectedUser ? (
                <div className="flex items-center justify-between rounded-lg border border-premium_pink/30 bg-premium_pink/10 px-3 py-2">
                  <span className="flex flex-wrap items-center gap-2 text-sm text-white">
                    {selectedUser.email}
                    {selectedUser.role && (
                      <span className="rounded-full border border-white/20 bg-white/5 px-2 py-0.5 text-[11px] text-white/70">
                        {roleLabel(selectedUser.role)}
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={clearUser}
                    className="ml-2 rounded p-0.5 text-white/60 hover:text-white"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
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
                    placeholder="Escribe el correo del usuario"
                    className="w-full rounded-lg border border-premium_pink/30 bg-panel_black px-3 py-2 pr-8 text-sm text-white placeholder:text-white/40 focus:border-premium_pink focus:outline-none focus:ring-1 focus:ring-premium_pink"
                  />
                  {loadingUsers && (
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                      <svg className="h-4 w-4 animate-spin text-premium_pink" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                      </svg>
                    </span>
                  )}
                </div>
              )}
              {filteredUsers.length > 0 && (
                <div className="absolute z-10 mt-1 max-h-36 w-full overflow-y-auto rounded-lg border border-premium_pink/20 bg-panel_black shadow-lg">
                  {filteredUsers.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => selectUser(u)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-white hover:bg-premium_pink/10"
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-premium_pink/15 text-xs font-semibold uppercase text-premium_pink">
                        {u.email[0]}
                      </div>
                      {u.email}
                    </button>
                  ))}
                </div>
              )}
              {userQuery.trim() && !selectedUser && filteredUsers.length === 0 && !loadingUsers && (
                <p className="mt-1 text-xs text-white/40">No se encontró ningún usuario con ese correo.</p>
              )}
              {selectedUser?.role === "reseller" && (
                <p className="mt-1 text-xs text-amber-300/90">
                  Es revendedor: el acceso a estas cuentas vencerá en 30 días.
                </p>
              )}
              {selectedUser?.role === "advisor" && (
                <p className="mt-1 text-xs text-sky-300/90">
                  Es asesor: ya puede consultar cualquier correo, vincular
                  cuentas no es necesario.
                </p>
              )}
            </div>

            <div>
              <span className="mb-1 block text-xs font-medium text-premium_pink">
                Correos de las cuentas
              </span>
              <textarea
                value={accountEmailsText}
                onChange={(e) => setAccountEmailsText(e.target.value)}
                placeholder={"Pega los correos de las cuentas separados por comas o saltos de línea\nej: cuenta1@correo.com, cuenta2@correo.com"}
                rows={4}
                className="w-full resize-none rounded-lg border border-premium_pink/30 bg-panel_black px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-premium_pink focus:outline-none focus:ring-1 focus:ring-premium_pink"
              />
              <button
                type="button"
                onClick={resolveAccountEmails}
                disabled={resolvingAccounts || !accountEmailsText.trim()}
                className="mt-2 w-full rounded-lg border border-premium_pink/30 bg-premium_pink/10 px-3 py-2 text-sm font-medium text-premium_pink transition hover:bg-premium_pink/20 disabled:opacity-50"
              >
                {resolvingAccounts ? "Buscando cuentas…" : "Buscar cuentas"}
              </button>
              {notFoundEmails.length > 0 && (
                <div className="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2">
                  <span className="block text-xs font-medium text-red-400">
                    No se encontraron ({notFoundEmails.length}):
                  </span>
                  <p className="mt-1 text-xs text-red-300/80 break-all">
                    {notFoundEmails.join(", ")}
                  </p>
                </div>
              )}
            </div>

            {selectedAccounts.length > 0 && (
              <div>
                <span className="mb-1 block text-xs font-medium text-premium_pink">
                  Cuentas seleccionadas ({selectedAccounts.length})
                </span>
                <div className="flex flex-wrap gap-2">
                  {selectedAccounts.map((acc) => (
                    <span
                      key={acc.id}
                      className="inline-flex items-center gap-1 rounded-full border border-premium_pink/30 bg-premium_pink/10 px-2.5 py-1 text-xs text-white"
                    >
                      {acc.email}
                      <button
                        type="button"
                        onClick={() => removeAccount(acc.id)}
                        className="ml-0.5 rounded-full p-0.5 text-white/60 hover:text-white"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3 w-3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setLinkOpen(false)}
                disabled={linking}
                className="rounded-lg border border-premium_pink/30 px-4 py-2 text-sm font-medium text-white/80 hover:bg-premium_pink/10 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={linking}
                className="rounded-lg bg-premium_pink px-4 py-2 text-sm font-semibold text-panel_black transition hover:opacity-90 disabled:opacity-60"
              >
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
              <div className="h-9 w-9 animate-pulse rounded-full bg-premium_pink/10" />
              <div className="h-3 w-40 animate-pulse rounded bg-premium_pink/10" />
            </div>
          </td>
          <td className="px-4 py-4">
            <div className="ml-auto h-3 w-20 animate-pulse rounded bg-premium_pink/10" />
          </td>
        </tr>
      ))}
    </>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-premium_pink/30 bg-panel_black p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-white/60 hover:bg-premium_pink/10 hover:text-white"
            aria-label="Cerrar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18 18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
