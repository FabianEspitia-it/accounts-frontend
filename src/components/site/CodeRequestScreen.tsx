"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { PacmanLoader } from "react-spinners";
import { toast } from "react-toastify";

import CopyButton from "@/components/site/CopyButton";
import SiteBackdrop from "@/components/site/SiteBackdrop";
import SiteHeader from "@/components/site/SiteHeader";
import { BTN_PRIMARY, FIELD, LABEL, PANEL } from "@/components/site/tokens";
import { brandVars, findService } from "@/lib/services-catalog";
import type {
  CodeResponse,
  LinkResponse,
  StreamingResult,
} from "@/lib/streaming-codes-client";

type Outcome =
  | { state: "idle" }
  | { state: "done"; value: string; email: string }
  | { state: "failed"; message: string };

const PACMAN_SIZE = 55;

/**
 * Lo que el Pacman se sale de su propia caja por la derecha.
 *
 * `PacmanLoader` mide `size * 2`, pero dibuja las bolitas en `left: size * 4`
 * (más 2px de margen y `size / 3` de ancho) y las anima hacia la izquierda.
 * Como ese exceso queda fuera de la caja, centrar el wrapper deja el conjunto
 * corrido a la derecha; este margen le devuelve al flex el ancho real.
 */
const PACMAN_OVERFLOW = PACMAN_SIZE * 4 + 2 + PACMAN_SIZE / 3 - PACMAN_SIZE * 2;

/**
 * Pantalla de un trámite: pedir un correo y devolver un código o un enlace.
 *
 * Los trece trámites comparten esta pantalla; lo único que cambia es qué
 * plataforma es y a qué endpoint se llama. Lo que se lleva el foco es el
 * resultado —el código, grande y monoespaciado, listo para dictar o pegar—
 * porque es lo único que el revendedor necesita de aquí.
 */
export default function CodeRequestScreen({
  slug,
  request,
}: {
  slug: string;
  request: (
    email: string
  ) => Promise<StreamingResult<CodeResponse | LinkResponse>>;
}) {
  const router = useRouter();
  const { platform, action } = findService(slug);
  const isLink = action.kind === "link";
  const noun = isLink ? "enlace" : "código";

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>({ state: "idle" });

  function failureMessage(status: number, detail?: string): string {
    switch (status) {
      case 0:
        return "No hay conexión con el servidor. Revisa tu internet e inténtalo otra vez.";
      case 400:
        return "Ese correo no tiene un formato válido. Revísalo e inténtalo otra vez.";
      case 403:
        // El backend distingue entre "esta cuenta no es tuya" y "estás fuera
        // de tu horario"; desde acá no se puede, así que manda su mensaje.
        return (
          detail ??
          "Esa cuenta no está asignada a tu usuario, o tu acceso ya venció. Pide al administrador que te la asigne o la renueve."
        );
      case 404:
        return `Todavía no llega ${
          isLink ? "el enlace" : "el código"
        } a ese correo. Espera unos segundos y vuelve a buscarlo.`;
      default:
        return `No pudimos traer el ${noun}. Inténtalo de nuevo en un momento.`;
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const target = email.trim();
    setLoading(true);
    setOutcome({ state: "idle" });

    try {
      const result = await request(target);

      if (result.ok) {
        const value =
          "code" in result.data ? result.data.code : result.data.link;
        setOutcome({ state: "done", value, email: target });
        return;
      }

      if (result.status === 401) {
        toast.error("Tu sesión expiró. Entra de nuevo.");
        router.replace("/login");
        return;
      }

      setOutcome({
        state: "failed",
        message: failureMessage(result.status, result.detail),
      });
    } catch {
      setOutcome({ state: "failed", message: failureMessage(0) });
    } finally {
      setLoading(false);
    }
  }

  /*
   * Mientras se consulta, el Pacman de siempre a pantalla completa: es el
   * gesto con el que la plataforma se reconoce y marca sin ambigüedad que hay
   * algo en marcha.
   */
  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-site-bg px-6">
        <div className="text-center">
          <div className="flex justify-center">
            <PacmanLoader
              color="#f1054d"
              size={PACMAN_SIZE}
              speedMultiplier={1.1}
              cssOverride={{ marginRight: PACMAN_OVERFLOW }}
            />
          </div>
          <p className="mt-10 text-[1rem] font-semibold text-site-text">
            Estamos trayendo el {noun}
          </p>
          <p className="mt-1.5 text-[0.9rem] text-site-muted">
            Espera unos segundos, por favor.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteBackdrop />
      <SiteHeader />

      <main className="mx-auto w-full max-w-xl px-5 pb-20 pt-8 sm:px-8 sm:pt-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-lg text-[0.85rem] font-medium text-site-muted transition hover:text-site-text"
        >
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            aria-hidden
            className="size-4"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4 6 10l6 6" />
          </svg>
          Todos los servicios
        </Link>

        {/* El color de marca lo elige el CSS según el tema: ver `.brand-fg`. */}
        <div
          className="mt-7 flex items-center gap-2.5"
          style={brandVars(platform)}
        >
          <span aria-hidden className="brand-bg h-2.5 w-2.5 rounded-full" />
          <span className="brand-fg text-[0.9rem] font-semibold">
            {platform.name}
          </span>
        </div>

        <h1 className="mt-2 text-[1.9rem] font-extrabold leading-[1.1] tracking-tight text-site-text sm:text-[2.3rem]">
          {action.title}
        </h1>
        <p className="mt-2.5 max-w-prose text-[1rem] leading-relaxed text-site-muted">
          {action.description}
        </p>

        <form onSubmit={onSubmit} className={`mt-8 p-5 sm:p-6 ${PANEL}`}>
          <label className="block">
            <span className={LABEL}>Correo de la cuenta</span>
            <input
              type="email"
              required
              autoFocus
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cuenta@correo.com"
              className={`${FIELD} font-mono`}
            />
          </label>

          {/* La espera la muestra el Pacman a pantalla completa, no el botón. */}
          <button type="submit" className={`mt-4 ${BTN_PRIMARY}`}>
            Buscar {noun}
          </button>
        </form>

        <div role="status" aria-live="polite">
          {outcome.state === "done" &&
            (isLink ? (
              <LinkResult link={outcome.value} email={outcome.email} />
            ) : (
              <CodeResult code={outcome.value} email={outcome.email} />
            ))}

          {outcome.state === "failed" && (
            <p className="mt-5 animate-result-in rounded-2xl border border-red-500/25 bg-red-500/[0.07] px-5 py-4 text-[0.92rem] leading-relaxed text-red-200">
              {outcome.message}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

/** Tamaño del código según lo largo que sea, para que nunca desborde. */
function codeSizeClass(code: string): string {
  if (code.length <= 8) return "text-[2.7rem] tracking-[0.2em] sm:text-[3.4rem]";
  if (code.length <= 14) return "text-[1.9rem] tracking-[0.12em] sm:text-[2.3rem]";
  return "text-[1.3rem] tracking-[0.06em] sm:text-[1.5rem]";
}

function CodeResult({ code, email }: { code: string; email: string }) {
  return (
    <div className="mt-5 animate-result-in overflow-hidden rounded-2xl border border-premium_pink/35 bg-premium_pink/[0.07]">
      <div className="px-5 py-7 text-center sm:py-9">
        <p
          className={`break-all font-mono font-bold leading-none text-site-text ${codeSizeClass(
            code
          )}`}
        >
          {code}
        </p>
      </div>
      <div className="flex flex-col gap-3 border-t border-premium_pink/20 bg-site-bg/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="min-w-0 truncate font-mono text-[0.8rem] text-site-muted">
          {email}
        </p>
        <CopyButton value={code} label="Copiar código" />
      </div>
    </div>
  );
}

function LinkResult({ link, email }: { link: string; email: string }) {
  return (
    <div className="mt-5 animate-result-in overflow-hidden rounded-2xl border border-premium_pink/35 bg-premium_pink/[0.07]">
      <div className="px-5 py-6">
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className={BTN_PRIMARY}
        >
          Abrir enlace
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            aria-hidden
            className="size-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4h4v4M16 4l-7 7M14 11.5V15a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 4 15V8a1.5 1.5 0 0 1 1.5-1.5H9"
            />
          </svg>
        </a>
        <p className="mt-3 break-all text-center font-mono text-[0.75rem] leading-relaxed text-site-faint">
          {link}
        </p>
      </div>
      <div className="flex flex-col gap-3 border-t border-premium_pink/20 bg-site-bg/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="min-w-0 truncate font-mono text-[0.8rem] text-site-muted">
          {email}
        </p>
        <CopyButton value={link} label="Copiar enlace" />
      </div>
    </div>
  );
}
