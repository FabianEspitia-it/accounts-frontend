/**
 * Vocabulario visual del sitio público (inicio, login y trámites).
 *
 * El dashboard tiene el suyo en `app/dashboard/_components/ui.ts`: son dos
 * productos distintos —uno es el panel del admin, el otro la herramienta del
 * revendedor— y mezclarlos obligaría a que cualquier ajuste de uno pasara por
 * el otro.
 */

/** Panel: superficie elevada sobre el fondo, sin sombra. */
export const PANEL =
  "rounded-2xl border border-site-line bg-site-surface/80 backdrop-blur-xl";

/** Campo de texto. `site-field` lo usa globals.css para domar el autocompletar. */
export const FIELD =
  "site-field w-full rounded-xl border border-site-line bg-site-raised/60 px-4 py-3 text-[0.95rem] text-site-text outline-none transition " +
  "placeholder:text-site-faint focus:border-premium_pink/60 focus:bg-site-raised focus:shadow-[0_0_0_3px_rgba(241,5,77,0.12)]";

/** Acción principal: una por pantalla. */
export const BTN_PRIMARY =
  "inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-premium_pink px-5 py-3 text-[0.95rem] font-semibold text-white transition " +
  "hover:bg-[#ff2464] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:bg-premium_pink";

/** Etiqueta sobre un campo. */
export const LABEL =
  "mb-2 block text-[0.85rem] font-medium text-site-muted";
