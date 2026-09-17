"use client";

import { useEffect, type ReactNode } from "react";
import { MODAL_OVERLAY, MODAL_PANEL } from "./ui";

/**
 * Modal del dashboard, con el mismo lenguaje que accounts-platform-frontend:
 * overlay oscuro con blur ligero, panel `#0c0c0f` y cabecera con chip de acento.
 *
 * Antes vivía duplicado en AccountsClient y UsersClient; aquí es uno solo.
 */
export default function Modal({
  title,
  onClose,
  children,
  size = "md",
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** `lg` para formularios con varios campos (vincular usuario, crear usuario). */
  size?: "md" | "lg";
}) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handler);
    };
  }, [onClose]);

  return (
    <div
      className={MODAL_OVERLAY}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`${MODAL_PANEL} ${
          size === "lg" ? "max-w-lg" : "max-w-md"
        } max-h-[90vh] overflow-y-auto`}
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-dash_accent/[0.1]">
              <span className="size-1.5 rounded-full bg-dash_accent" aria-hidden />
            </div>
            <h3 className="text-[0.95rem] font-bold text-white">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/30 transition hover:bg-white/[0.06] hover:text-white/60"
            aria-label="Cerrar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden
              className="size-5"
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
