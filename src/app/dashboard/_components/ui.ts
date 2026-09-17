/**
 * Vocabulario visual del dashboard, calcado de accounts-platform-frontend.
 *
 * Allí cada vista redeclara estas cadenas; aquí se centralizan porque las tres
 * páginas (usuarios, cuentas, solicitudes) son ficheros grandes y repetirlas
 * garantiza que se desincronicen.
 */

/** Inputs, selects y textareas. */
export const INPUT_CLASS =
  "w-full rounded-xl border border-white/[0.07] bg-white/[0.03] px-3.5 py-2 text-[0.8rem] text-white outline-none transition placeholder:text-white/15 " +
  "focus:border-dash_accent/40 focus:bg-dash_accent/[0.03] focus:shadow-[0_0_0_3px_var(--ui-accent-ring)]";

/** Etiqueta de campo: versalitas finas sobre el input. */
export const LABEL_CLASS =
  "mb-2 block text-[0.65rem] font-bold uppercase tracking-[0.1em] text-white/30";

/** Botón neutro (buscar, filtrar, acciones secundarias). */
export const BTN_NEUTRAL =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-white/[0.05] px-4 py-2 text-[0.75rem] font-medium tracking-wide text-white/60 ring-1 ring-white/[0.08] transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-40";

/** Botón de acento (acción principal del formulario). */
export const BTN_ACCENT =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-dash_accent/10 px-4 py-2 text-[0.75rem] font-medium tracking-wide text-dash_accent ring-1 ring-dash_accent/30 transition hover:bg-dash_accent/20 hover:ring-dash_accent/50 disabled:cursor-not-allowed disabled:opacity-40";

/** Botón fantasma (cancelar, limpiar). */
export const BTN_GHOST =
  "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-[0.75rem] font-medium tracking-wide text-white/40 transition hover:bg-white/[0.06] hover:text-white/70 disabled:cursor-not-allowed disabled:opacity-40";

/** Botón destructivo. */
export const BTN_DANGER =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-red-500/[0.08] px-4 py-2 text-[0.75rem] font-medium tracking-wide text-red-400 ring-1 ring-red-500/25 transition hover:bg-red-500/[0.14] hover:ring-red-500/40 disabled:cursor-not-allowed disabled:opacity-40";

/** Botón de icono en celdas de tabla. */
export const BTN_ICON =
  "rounded-lg p-1.5 text-white/25 transition-all duration-200 hover:bg-white/[0.08] hover:text-white/60 disabled:cursor-not-allowed disabled:opacity-40";

/** Tarjeta/panel: filtros, bloques de formulario, contenedores de tabla. */
export const CARD =
  "rounded-2xl border border-white/[0.06] bg-white/[0.02]";

/** Celda de cabecera de tabla. */
export const TH =
  "px-4 py-3.5 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-white/30";

/** Enlace/botón de paginación. */
export const PAGER =
  "inline-flex items-center gap-1.5 rounded-xl border border-white/[0.06] px-3.5 py-2 text-[0.75rem] font-medium text-white/50 transition hover:bg-white/[0.05] hover:text-white disabled:pointer-events-none disabled:opacity-25";

/** Píldora de estado/etiqueta. */
export const BADGE =
  "inline-flex items-center rounded-lg px-2 py-0.5 text-[0.75rem] font-medium ring-1 ring-inset";

/** Capa oscura de los modales. */
export const MODAL_OVERLAY =
  "fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]";

/** Panel del modal. */
export const MODAL_PANEL =
  "relative w-full animate-fade-in rounded-2xl border border-white/[0.08] bg-dash_panel p-6 shadow-2xl";
