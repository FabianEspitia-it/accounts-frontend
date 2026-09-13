"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  BADGE,
  BTN_ACCENT,
  BTN_GHOST,
  BTN_NEUTRAL,
  CARD,
  INPUT_CLASS,
  LABEL_CLASS,
  PAGER,
  TH,
} from "../_components/ui";

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
    return "bg-red-500/[0.08] text-red-300/80 ring-red-500/15";
  }
  if (normalized.includes("disney")) {
    return "bg-blue-500/[0.08] text-blue-300/80 ring-blue-500/15";
  }
  if (normalized.includes("prime")) {
    return "bg-sky-500/[0.08] text-sky-300/80 ring-sky-500/15";
  }
  if (normalized.includes("hbo") || normalized.includes("max")) {
    return "bg-purple-500/[0.08] text-purple-300/80 ring-purple-500/15";
  }
  if (normalized.includes("youtube")) {
    return "bg-rose-500/[0.08] text-rose-300/80 ring-rose-500/15";
  }
  if (normalized.includes("spotify")) {
    return "bg-green-500/[0.08] text-green-300/80 ring-green-500/15";
  }
  if (normalized.includes("crunchyroll")) {
    return "bg-orange-500/[0.08] text-orange-300/80 ring-orange-500/15";
  }
  if (normalized.includes("universal")) {
    return "bg-yellow-500/[0.08] text-yellow-200/80 ring-yellow-500/15";
  }
  return "bg-fuchsia-500/[0.08] text-fuchsia-300/80 ring-fuchsia-500/15";
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
    <div className="animate-fade-in">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Solicitudes
          </h1>
          <p className="mt-1.5 text-sm text-white/35">
            Historial de peticiones realizadas a los servicios de streaming.
          </p>
        </div>
        <button
          type="button"
          onClick={reload}
          disabled={loading}
          className={BTN_NEUTRAL}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden
            className={`size-4 ${loading ? "animate-spin" : ""}`}
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

      <form onSubmit={applyFilters} className={`${CARD} p-5`}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <label className="block">
            <span className={LABEL_CLASS}>Correo cliente</span>
            <input
              type="text"
              value={filters.email}
              onChange={(e) =>
                setFilters((f) => ({ ...f, email: e.target.value }))
              }
              placeholder="cliente@correo.com"
              className={INPUT_CLASS}
            />
          </label>
          <label className="block">
            <span className={LABEL_CLASS}>Solicitado por</span>
            <input
              type="text"
              value={filters.requested_by}
              onChange={(e) =>
                setFilters((f) => ({ ...f, requested_by: e.target.value }))
              }
              placeholder="admin@premiummm.com"
              className={INPUT_CLASS}
            />
          </label>
          <label className="block">
            <span className={LABEL_CLASS}>Servicio</span>
            <select
              value={filters.service_name}
              onChange={(e) =>
                setFilters((f) => ({ ...f, service_name: e.target.value }))
              }
              className={`${INPUT_CLASS} cursor-pointer`}
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
            <span className={LABEL_CLASS}>Desde</span>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) =>
                setFilters((f) => ({ ...f, start_date: e.target.value }))
              }
              className={`${INPUT_CLASS} [color-scheme:dark]`}
            />
          </label>
          <label className="block">
            <span className={LABEL_CLASS}>Hasta</span>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) =>
                setFilters((f) => ({ ...f, end_date: e.target.value }))
              }
              className={`${INPUT_CLASS} [color-scheme:dark]`}
            />
          </label>
        </div>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          {hasFilters && (
            <button type="button" onClick={clearFilters} className={BTN_GHOST}>
              Limpiar filtros
            </button>
          )}
          <button type="submit" disabled={loading} className={BTN_ACCENT}>
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
            Buscar
          </button>
        </div>
      </form>

      <div className={`mt-5 overflow-hidden ${CARD}`}>
        <div className="flex flex-col gap-3 border-b border-white/[0.06] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-[0.75rem] text-white/25">
            <span className="font-medium text-white/60">
              {total.toLocaleString("es-CO")}
            </span>{" "}
            solicitudes en total
          </div>
          <span className="text-[0.75rem] text-white/20">
            {total === 0
              ? "Sin resultados"
              : `Mostrando ${rangeStart}–${rangeEnd}`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="border-b border-white/[0.06]">
              <tr className="bg-white/[0.03]">
                <th className={TH}>Solicitado por</th>
                <th className={TH}>Correo cliente</th>
                <th className={TH}>Teléfono</th>
                <th className={TH}>Servicio</th>
                <th className={TH}>Acción</th>
                <th className={TH}>Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading && items.length === 0 && <SkeletonRows />}

              {!loading && errorMsg && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
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

              {!loading && !errorMsg && items.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-sm text-white/20"
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
                    className="transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#ff0055]/[0.08] text-[0.75rem] font-bold uppercase text-[#ff0055] ring-1 ring-[#ff0055]/15">
                          {log.requested_by?.[0] ?? "?"}
                        </div>
                        <span className="text-white/75">{log.requested_by}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white/50">{log.email}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-[0.8rem] text-white/50">
                      {log.phone_number || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`${BADGE} ${serviceBadgeClasses(
                          log.service_name
                        )}`}
                      >
                        {log.service_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/50">
                      {log.service_action_name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-[0.75rem] text-white/35">
                      {formatDateTime(log.created_at)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/[0.06] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[0.75rem] text-white/20">
            Página {currentPage} de {totalPages}
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
              <div className="size-8 animate-pulse rounded-lg bg-white/[0.04]" />
              <div className="h-3 w-40 animate-pulse rounded bg-white/[0.04]" />
            </div>
          </td>
          <td className="px-4 py-4">
            <div className="h-3 w-44 animate-pulse rounded bg-white/[0.04]" />
          </td>
          <td className="px-4 py-4">
            <div className="h-3 w-32 animate-pulse rounded bg-white/[0.04]" />
          </td>
          <td className="px-4 py-4">
            <div className="h-5 w-20 animate-pulse rounded-lg bg-white/[0.04]" />
          </td>
          <td className="px-4 py-4">
            <div className="h-3 w-48 animate-pulse rounded bg-white/[0.04]" />
          </td>
          <td className="px-4 py-4">
            <div className="h-3 w-32 animate-pulse rounded bg-white/[0.04]" />
          </td>
        </tr>
      ))}
    </>
  );
}
