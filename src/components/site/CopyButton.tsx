"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Copiar al portapapeles.
 *
 * Es la acción que cierra el trabajo: el revendedor pega el código en el chat
 * del cliente. Confirma en el propio botón —"Copiado"— porque un toast que
 * aparece en otra esquina no responde a lo que acaba de pulsar.
 */
export default function CopyButton({
  value,
  label = "Copiar",
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Safari sin permiso o contexto no seguro: el usuario todavía puede
      // seleccionar el texto a mano, así que no se interrumpe con un error.
      return;
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-live="polite"
      className={
        className ??
        "inline-flex items-center justify-center gap-2 rounded-xl border border-site-line bg-site-raised/70 px-4 py-2.5 text-[0.85rem] font-semibold text-site-text transition hover:border-premium_pink/50 hover:bg-premium_pink/10"
      }
    >
      {copied ? (
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
          className="size-4 text-emerald-400"
        >
          <path
            fillRule="evenodd"
            d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0l-3.5-3.5a1 1 0 1 1 1.4-1.4l2.8 2.79 6.8-6.79a1 1 0 0 1 1.4 0Z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          aria-hidden
          className="size-4"
        >
          <rect x="7" y="7" width="9.5" height="9.5" rx="2" />
          <path
            strokeLinecap="round"
            d="M13 4.5A1.5 1.5 0 0 0 11.5 3h-6A2.5 2.5 0 0 0 3 5.5v6A1.5 1.5 0 0 0 4.5 13"
          />
        </svg>
      )}
      {copied ? "Copiado" : label}
    </button>
  );
}
