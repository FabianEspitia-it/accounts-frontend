export type Theme = "light" | "dark";

/** Clave en localStorage. El nombre viaja al script inline de abajo: cambiar uno es cambiar los dos. */
export const THEME_STORAGE_KEY = "accounts-theme";

/**
 * Tema para quien nunca ha elegido. La app nació oscura, así que quien entra
 * hoy sigue viendo lo de siempre y el claro es algo que se pide, no algo que
 * aparece. Para arrancar siguiendo al sistema operativo, poner "system".
 */
export const DEFAULT_THEME: Theme | "system" = "dark";

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

/**
 * Se ejecuta en el <head>, antes del primer pintado: si esperáramos a React,
 * el navegador alcanzaría a pintar la app en oscuro y a quien tiene el claro
 * guardado le daría un fogonazo al cargar cada página.
 */
export const THEME_INIT_SCRIPT = `(function(){try{
var k=${JSON.stringify(THEME_STORAGE_KEY)},d=${JSON.stringify(DEFAULT_THEME)};
var s=localStorage.getItem(k);
var t=(s==="light"||s==="dark")?s:(d==="system"?(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"):d);
var e=document.documentElement;e.dataset.theme=t;e.style.colorScheme=t;
}catch(e){}})();`;
