"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

type RequestLog = {
  id: string;
  user_id: string;
  requested_by: string;
  email: string;
  phone_number: string;
  service_action_id: string;
  service_action_name: string;
  service_name: string;
  created_at: string;
};

type ListResponse = {
  total: number;
  skip: number;
  limit: number;
  items: RequestLog[];
};

type Service = {
  id: string;
  name: string;
};

type ServicesResponse = {
  items: Service[];
};

type Filters = {
  email: string;
  requested_by: string;
  service_name: string;
  start_date: string;
  end_date: string;
};

const EMPTY_FILTERS: Filters = {
  email: "",
  requested_by: "",
  service_name: "",
  start_date: "",
  end_date: "",
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

function formatDateTime(iso: string): string {
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return new Intl.DateTimeFormat("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return iso;
  }
}

function toIsoFromDateInput(value: string, endOfDay = false): string | null {
  if (!value) return null;
  const suffix = endOfDay ? "T23:59:59" : "T00:00:00";
  return `${value}${suffix}`;
}

function serviceBadgeClasses(service: string): string {
  const normalized = service.toLowerCase();
  if (normalized.includes("netflix")) {
    return "bg-red-500/15 text-red-300 ring-red-400/30";
  }
  if (normalized.includes("disney")) {
    return "bg-blue-500/15 text-blue-300 ring-blue-400/30";
  }
  if (normalized.includes("prime")) {
    return "bg-sky-500/15 text-sky-300 ring-sky-400/30";
  }
  if (normalized.includes("hbo") || normalized.includes("max")) {
    return "bg-purple-500/15 text-purple-300 ring-purple-400/30";
  }
  if (normalized.includes("youtube")) {
    return "bg-rose-500/15 text-rose-300 ring-rose-400/30";
  }
  if (normalized.includes("spotify")) {
    return "bg-green-500/15 text-green-300 ring-green-400/30";
  }
  if (normalized.includes("crunchyroll")) {
    return "bg-orange-500/15 text-orange-300 ring-orange-400/30";
  }
  if (normalized.includes("universal")) {
    return "bg-yellow-500/15 text-yellow-200 ring-yellow-400/30";
  }
  return "bg-premium_pink/15 text-premium_pink ring-premium_pink/30";
}

export default function RequestsClient() {
  const [items, setItems] = useState<RequestLog[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [services, setServices] = useState<Service[]>([]);

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(EMPTY_FILTERS);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/upstream/services", {
          method: "GET",
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as ServicesResponse;
        if (cancelled) return;
        setServices(Array.isArray(data?.items) ? data.items : []);
      } catch {
        /* silent: filtro de servicio queda vacío */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchRequests = useCallback(
    async (currentSkip: number, current: Filters, signal: AbortSignal) => {
      const params = new URLSearchParams();
      params.set("skip", String(currentSkip));
      params.set("limit", String(PAGE_SIZE));

      const email = current.email.trim();
      if (email) params.set("email", email);

      const requestedBy = current.requested_by.trim();
      if (requestedBy) params.set("requested_by", requestedBy);

      const serviceName = current.service_name.trim();
      if (serviceName) params.set("service_name", serviceName);

      const startIso = toIsoFromDateInput(current.start_date, false);
      if (startIso) params.set("start_date", startIso);

      const endIso = toIsoFromDateInput(current.end_date, true);
      if (endIso) params.set("end_date", endIso);

      const res = await fetch(`/api/upstream/requests?${params.toString()}`, {
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
        const data = await fetchRequests(skip, appliedFilters, controller.signal);
        setItems(Array.isArray(data?.items) ? data.items : []);
        setTotal(typeof data?.total === "number" ? data.total : 0);
      } catch (err) {
        if (controller.signal.aborted) return;
        const message =
          err instanceof Error ? err.message : "No se pudieron cargar las solicitudes";
        setErrorMsg(message);
        setItems([]);
        setTotal(0);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [skip, appliedFilters, reloadToken, fetchRequests]);

  function applyFilters(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (
      filters.start_date &&
      filters.end_date &&
      filters.start_date > filters.end_date
    ) {
      toast.error("La fecha inicial no puede ser mayor que la final");
      return;
    }
    setSkip(0);
    setAppliedFilters({ ...filters });
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setSkip(0);
  }

  function reload() {
    setReloadToken((k) => k + 1);
  }

  const hasFilters = useMemo(
    () =>
      Boolean(
        appliedFilters.email ||
          appliedFilters.requested_by ||
          appliedFilters.service_name ||
          appliedFilters.start_date ||
          appliedFilters.end_date
      ),
    [appliedFilters]
  );

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

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white md:text-3xl">
            Solicitudes
          </h2>
          <p className="mt-1 text-sm text-white/70">
            Historial de peticiones realizadas a los servicios de streaming.
          </p>
        </div>
        <button
          type="button"
          onClick={reload}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-premium_pink/30 px-4 py-2.5 text-sm font-medium text-premium_pink transition hover:bg-premium_pink/10 disabled:opacity-60"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992V4.356M2.985 19.644v-4.992h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
            />
          </svg>
          Actualizar
        </button>
      </div>

      <form
        onSubmit={applyFilters}
        className="rounded-2xl border border-premium_pink/20 bg-panel_black p-4 md:p-5"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-premium_pink">
              Correo cliente
            </span>
            <input
              type="text"
              value={filters.email}
              onChange={(e) =>
                setFilters((f) => ({ ...f, email: e.target.value }))
              }
              placeholder="cliente@correo.com"
              className="w-full rounded-lg border border-premium_pink/30 bg-panel_black px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-premium_pink focus:outline-none focus:ring-1 focus:ring-premium_pink"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-premium_pink">
              Solicitado por
            </span>
            <input
              type="text"
              value={filters.requested_by}
              onChange={(e) =>
                setFilters((f) => ({ ...f, requested_by: e.target.value }))
              }
              placeholder="admin@premiummm.com"
              className="w-full rounded-lg border border-premium_pink/30 bg-panel_black px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-premium_pink focus:outline-none focus:ring-1 focus:ring-premium_pink"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-premium_pink">
              Servicio
            </span>
            <select
              value={filters.service_name}
              onChange={(e) =>
                setFilters((f) => ({ ...f, service_name: e.target.value }))
              }
              className="w-full rounded-lg border border-premium_pink/30 bg-panel_black px-3 py-2 text-sm text-white focus:border-premium_pink focus:outline-none focus:ring-1 focus:ring-premium_pink"
            >
              <option value="">Todos</option>
              {services.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-premium_pink">
              Desde
            </span>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) =>
                setFilters((f) => ({ ...f, start_date: e.target.value }))
              }
              className="w-full rounded-lg border border-premium_pink/30 bg-panel_black px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-premium_pink focus:outline-none focus:ring-1 focus:ring-premium_pink [color-scheme:dark]"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-premium_pink">
              Hasta
            </span>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) =>
                setFilters((f) => ({ ...f, end_date: e.target.value }))
              }
              className="w-full rounded-lg border border-premium_pink/30 bg-panel_black px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-premium_pink focus:outline-none focus:ring-1 focus:ring-premium_pink [color-scheme:dark]"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-lg border border-premium_pink/30 px-4 py-2 text-sm font-medium text-white/80 hover:bg-premium_pink/10"
            >
              Limpiar filtros
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-premium_pink px-4 py-2 text-sm font-semibold text-panel_black transition hover:opacity-90 disabled:opacity-60"
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
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
            Buscar
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-premium_pink/20 bg-panel_black">
        <div className="flex flex-col gap-3 border-b border-premium_pink/20 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-white/80">
            <span className="font-semibold text-white">
              {total.toLocaleString("es-CO")}
            </span>{" "}
            <span className="text-white/60">solicitudes en total</span>
          </div>
          <span className="text-xs text-white/60">
            {total === 0
              ? "Sin resultados"
              : `Mostrando ${rangeStart}–${rangeEnd}`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-premium_pink/5 text-xs uppercase tracking-wide text-premium_pink/80">
              <tr>
                <th className="px-4 py-3 font-semibold">Solicitado por</th>
                <th className="px-4 py-3 font-semibold">Correo cliente</th>
                <th className="px-4 py-3 font-semibold">Teléfono</th>
                <th className="px-4 py-3 font-semibold">Servicio</th>
                <th className="px-4 py-3 font-semibold">Acción</th>
                <th className="px-4 py-3 font-semibold">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-premium_pink/10">
              {loading && items.length === 0 && <SkeletonRows />}

              {!loading && errorMsg && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center">
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

              {!loading && !errorMsg && items.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-white/60"
                  >
                    {hasFilters
                      ? "Ninguna solicitud coincide con los filtros."
                      : "Todavía no hay solicitudes registradas."}
                  </td>
                </tr>
              )}

              {!errorMsg &&
                items.map((log) => (
                  <tr
                    key={log.id}
                    className="transition hover:bg-premium_pink/5"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-premium_pink/15 text-sm font-semibold uppercase text-premium_pink">
                          {log.requested_by?.[0] ?? "?"}
                        </div>
                        <span className="font-medium text-white">
                          {log.requested_by}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white/85">{log.email}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-white/85">
                      {log.phone_number || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${serviceBadgeClasses(
                          log.service_name
                        )}`}
                      >
                        {log.service_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/85">
                      {log.service_action_name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-white/70">
                      {formatDateTime(log.created_at)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-premium_pink/20 p-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-white/60">
            Página {currentPage} de {totalPages}
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
    </div>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i}>
          <td className="px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 animate-pulse rounded-full bg-premium_pink/10" />
              <div className="h-3 w-40 animate-pulse rounded bg-premium_pink/10" />
            </div>
          </td>
          <td className="px-4 py-4">
            <div className="h-3 w-44 animate-pulse rounded bg-premium_pink/10" />
          </td>
          <td className="px-4 py-4">
            <div className="h-3 w-32 animate-pulse rounded bg-premium_pink/10" />
          </td>
          <td className="px-4 py-4">
            <div className="h-5 w-20 animate-pulse rounded-full bg-premium_pink/10" />
          </td>
          <td className="px-4 py-4">
            <div className="h-3 w-48 animate-pulse rounded bg-premium_pink/10" />
          </td>
          <td className="px-4 py-4">
            <div className="h-3 w-32 animate-pulse rounded bg-premium_pink/10" />
          </td>
        </tr>
      ))}
    </>
  );
}
