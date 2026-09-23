"use client";

import { useEffect, useRef, useState } from "react";

import { UserRole, roleLabel } from "@/lib/roles";
import { formatPhoneNumber } from "@/components/PhoneNumberField";
import Modal from "../_components/Modal";
import { BTN_ACCENT, BTN_GHOST } from "../_components/ui";

/**
 * Lo que hay que entregarle al usuario después de crearlo o de editarlo.
 *
 * `password` solo viene cuando el administrador acaba de fijarla: el backend
 * guarda el hash y no la devuelve nunca, así que esta pantalla es la única
 * oportunidad de copiarla.
 */
export type Credentials = {
  title: string;
  intro: string;
  email: string | null;
  phone: string | null;
  password: string | null;
  role?: UserRole;
  /**
   * Qué mensaje de entrega se arma para pegarle al vendedor. La cabecera de
   * "contraseñas actualizadas" solo tiene sentido cuando de verdad se le
   * cambió la contraseña a alguien que ya entraba; al crearlo se omite.
   */
  announcement?: "password-updated" | "new-user";
};

/** Dónde entra el vendedor. Va en el mensaje, no en la pantalla. */
const CODES_URL = "https://www.accountspremiummm.com/";

const ANNOUNCEMENT_HEADER =
  "🔒 CONTRASEÑAS ACTUALIZADAS – USO EXCLUSIVO PARA VENDEDORES 🔒";

/**
 * El mensaje completo listo para WhatsApp: acceso, credenciales y el aviso de
 * monitoreo. Los asteriscos simples son los que WhatsApp pinta en negrita.
 */
function announcementText(creds: Credentials): string | null {
  // Sin usuario o sin contraseña el mensaje no sirve para entrar, así que no
  // se ofrece: es justo lo que pasa al editar solo el rol o el número.
  const user = creds.email ?? creds.phone;
  if (!creds.announcement || !user || !creds.password) return null;

  const lines: string[] = [];
  if (creds.announcement === "password-updated") {
    lines.push(ANNOUNCEMENT_HEADER, "");
  }
  lines.push(
    `🌐 Accede a nuestra página de códigos desde: ${CODES_URL}`,
    "",
    `usuario : ${user}`,
    `clave : ${creds.password}`,
    "",
    "⚠️ *AVISO IMPORTANTE*",
    "",
    "El uso de la plataforma y las solicitudes realizadas son *monitoreados constantemente*.",
    "",
    "🚨 Si detectamos alguna solicitud sospechosa o uso indebido, el usuario será *bloqueado de inmediato*, se notificará a los administradores y las cuentas asociadas podrán ser *cortadas sin derecho a devolución*.",
    "",
    "✅ *Use correctamente la plataforma y evite bloqueos.*"
  );
  return lines.join("\n");
}

/** Texto de una línea "Etiqueta: valor", omitiendo lo que no aplica. */
function shareableText(creds: Credentials): string {
  const lines: string[] = [];
  if (creds.email) lines.push(`Correo: ${creds.email}`);
  if (creds.phone) lines.push(`Número: ${formatPhoneNumber(creds.phone)}`);
  if (creds.password) lines.push(`Contraseña: ${creds.password}`);
  return lines.join("\n");
}

/**
 * Copiar al portapapeles confirmando en el propio botón.
 *
 * El aviso va aquí y no en un toast porque el administrador está pulsando
 * varios botones seguidos y necesita saber cuál de ellos respondió.
 */
function useCopy(): [boolean, (value: string) => Promise<void>] {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Contexto no seguro o permiso denegado: el valor sigue en pantalla para
      // seleccionarlo a mano, así que no se interrumpe con un error.
      return;
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  }

  return [copied, copy];
}

function CopyIcon({ copied }: { copied: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      aria-hidden
      className={`size-4 shrink-0 ${copied ? "text-emerald-400" : ""}`}
    >
      {copied ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="m4 10.5 4 4 8-8" />
      ) : (
        <>
          <rect x="7" y="7" width="9.5" height="9.5" rx="2" />
          <path
            strokeLinecap="round"
            d="M13 4.5A1.5 1.5 0 0 0 11.5 3h-6A2.5 2.5 0 0 0 3 5.5v6A1.5 1.5 0 0 0 4.5 13"
          />
        </>
      )}
    </svg>
  );
}

/** Una fila del bloque: etiqueta, valor seleccionable y botón de copiar. */
function CopyRow({
  label,
  value,
  copyValue,
  emphasis = false,
}: {
  label: string;
  value: string;
  /** Lo que va al portapapeles si difiere de lo que se muestra. */
  copyValue?: string;
  /** La contraseña: monoespaciada y con más peso, es lo que se busca al mirar. */
  emphasis?: boolean;
}) {
  const [copied, copy] = useCopy();

  return (
    <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
      <div className="min-w-0">
        <span className="block text-[0.65rem] font-bold uppercase tracking-[0.1em] text-white/30">
          {label}
        </span>
        <span
          className={`mt-0.5 block select-all break-all ${
            emphasis
              ? "font-mono text-[1.05rem] font-bold tracking-[0.15em] text-white"
              : "text-[0.85rem] text-white/70"
          }`}
        >
          {value}
        </span>
      </div>
      <button
        type="button"
        onClick={() => copy(copyValue ?? value)}
        aria-live="polite"
        aria-label={`Copiar ${label.toLowerCase()}`}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white/[0.04] px-2.5 py-1.5 text-[0.7rem] font-medium text-white/50 ring-1 ring-inset ring-white/[0.07] transition hover:bg-white/[0.08] hover:text-white"
      >
        <CopyIcon copied={copied} />
        {copied ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}

/**
 * Resumen de acceso tras crear o editar un usuario, listo para copiar y pegar
 * en el chat donde se le entrega.
 */
export default function CredentialsModal({
  credentials,
  onClose,
}: {
  credentials: Credentials;
  onClose: () => void;
}) {
  const [copiedAll, copyAll] = useCopy();
  const [copiedMessage, copyMessage] = useCopy();
  const text = shareableText(credentials);
  const announcement = announcementText(credentials);

  return (
    <Modal title={credentials.title} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-[0.8rem] text-white/45">{credentials.intro}</p>

        {!announcement && (
          <div className="divide-y divide-white/[0.05] overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.02]">
            {credentials.email && (
              <CopyRow label="Correo" value={credentials.email} />
            )}
            {credentials.phone && (
              <CopyRow
                label="Número"
                value={formatPhoneNumber(credentials.phone)}
                // Se copia en E.164: es lo que espera el formulario de login y
                // lo que WhatsApp entiende como número marcable.
                copyValue={credentials.phone}
              />
            )}
            {credentials.password && (
              <CopyRow
                label="Contraseña"
                value={credentials.password}
                emphasis
              />
            )}
            {credentials.role && (
              <div className="px-3.5 py-2.5">
                <span className="block text-[0.65rem] font-bold uppercase tracking-[0.1em] text-white/30">
                  Rol
                </span>
                <span className="mt-0.5 block text-[0.85rem] text-white/70">
                  {roleLabel(credentials.role)}
                </span>
              </div>
            )}
          </div>
        )}

        {announcement && (
          <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.02]">
            <div className="border-b border-white/[0.05] px-3.5 py-2.5">
              <span className="block text-[0.65rem] font-bold uppercase tracking-[0.1em] text-white/30">
                Mensaje para el vendedor
              </span>
            </div>
            <pre className="max-h-56 select-all overflow-y-auto whitespace-pre-wrap break-words px-3.5 py-3 font-sans text-[0.75rem] leading-relaxed text-white/60">
              {announcement}
            </pre>
          </div>
        )}

        {credentials.password ? (
          <p className="rounded-xl bg-amber-500/[0.06] px-3.5 py-2.5 text-[0.75rem] text-amber-200/70 ring-1 ring-inset ring-amber-500/15">
            Cópiala antes de cerrar: queda guardada cifrada y no se puede volver
            a consultar.
          </p>
        ) : (
          <p className="text-[0.75rem] text-white/25">
            La contraseña no cambió, así que no se muestra aquí.
          </p>
        )}

        <div className="flex items-center justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} className={BTN_GHOST}>
            Cerrar
          </button>
          {announcement ? (
            <button
              type="button"
              onClick={() => copyMessage(announcement)}
              aria-live="polite"
              className={BTN_ACCENT}
            >
              <CopyIcon copied={copiedMessage} />
              {copiedMessage ? "Copiado" : "Copiar mensaje"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => copyAll(text)}
              aria-live="polite"
              className={BTN_ACCENT}
            >
              <CopyIcon copied={copiedAll} />
              {copiedAll ? "Copiado" : "Copiar todo"}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
