"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  isTheme,
  type Theme,
} from "@/lib/theme";

/* ---------------------------------------------------------------------------
 * El tema vive en el DOM, no en React
 *
 * Quien manda es el atributo `data-theme` de <html>, que el script del <head>
 * deja puesto antes del primer pintado. React se suscribe a él con
 * `useSyncExternalStore` en vez de guardarlo en un estado propio: así no hay
 * dos fuentes de verdad, y la primera pasada de hidratación usa el valor del
 * servidor sin desajustes.
 * ------------------------------------------------------------------------- */

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function onStorage(event: StorageEvent) {
  // Otra pestaña cambió el tema: ésta se pone al día sin recargar.
  if (event.key !== THEME_STORAGE_KEY || !isTheme(event.newValue)) return;
  writeTheme(event.newValue, { persist: false, animate: false });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): Theme {
  const current = document.documentElement.dataset.theme;
  return isTheme(current) ? current : "dark";
}

/** En el servidor no se sabe qué eligió cada quien; el CSS por defecto es oscuro. */
function getServerSnapshot(): Theme {
  return "dark";
}

function readStoredTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isTheme(stored)) return stored;
  } catch {
    /* Almacenamiento bloqueado (incógnito, permisos): se sigue con el defecto. */
  }
  if (DEFAULT_THEME === "system") {
    return window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  }
  return DEFAULT_THEME;
}

let transitionTimer: ReturnType<typeof setTimeout> | null = null;

function writeTheme(
  next: Theme,
  { persist = true, animate = true }: { persist?: boolean; animate?: boolean } = {}
) {
  const root = document.documentElement;
  if (root.dataset.theme === next) return;

  if (animate) {
    // Un fundido corto sólo mientras dura el cambio: dejarlo puesto le daría
    // inercia al hover de cada fila de cada tabla.
    root.dataset.themeSwitching = "";
    if (transitionTimer) clearTimeout(transitionTimer);
    transitionTimer = setTimeout(() => {
      delete root.dataset.themeSwitching;
      transitionTimer = null;
    }, 240);
  }

  root.dataset.theme = next;
  root.style.colorScheme = next;

  if (persist) {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* Sin almacenamiento el tema vale para esta sesión y ya. */
    }
  }

  emit();
}

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  /**
   * `false` durante el render del servidor y la hidratación. Quien pinte el
   * tema (el botón) espera a que sea `true` en vez de adivinar.
   */
  ready: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  useEffect(() => {
    // Red de seguridad: si el script del <head> no llegó a correr, el atributo
    // no está y la preferencia guardada se aplicaría a la nada.
    if (isTheme(document.documentElement.dataset.theme)) return;
    writeTheme(readStoredTheme(), { animate: false });
  }, []);

  const setTheme = useCallback((next: Theme) => writeTheme(next), []);

  const toggleTheme = useCallback(
    () => writeTheme(getSnapshot() === "dark" ? "light" : "dark"),
    []
  );

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, toggleTheme, ready }),
    [theme, setTheme, toggleTheme, ready]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme debe usarse dentro de <ThemeProvider>.");
  }
  return context;
}
