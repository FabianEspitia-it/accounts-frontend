"use client";

import type { ComponentType, SVGProps } from "react";
import { useTheme } from "@/components/theme-provider";
import type { Theme } from "@/lib/theme";

/* Heroicons v2 outline, inline: aquí no hay react-icons y no compensa sumarlo. */
type IconProps = SVGProps<SVGSVGElement>;

function HeroIcon({ d, ...props }: IconProps & { d: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

const SunIcon = (props: IconProps) => (
  <HeroIcon
    {...props}
    d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
  />
);

const MoonIcon = (props: IconProps) => (
  <HeroIcon
    {...props}
    d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
  />
);

const OPTIONS: { value: Theme; label: string; Icon: ComponentType<IconProps> }[] =
  [
    { value: "light", label: "Claro", Icon: SunIcon },
    { value: "dark", label: "Oscuro", Icon: MoonIcon },
  ];

/**
 * Control de dos posiciones en vez de un botón que alterna a ciegas: se ve
 * cuál está puesto y cuál es la otra opción, sin tener que pulsar para saberlo.
 *
 * `variant` existe porque el sitio público y el dashboard son dos lenguajes
 * visuales distintos (ver `components/site/tokens.ts` y `dashboard/_components/ui.ts`).
 */
export function ThemeToggle({
  variant = "dashboard",
  className = "",
}: {
  variant?: "dashboard" | "site";
  className?: string;
}) {
  const { theme, setTheme, ready } = useTheme();

  const shell =
    variant === "site"
      ? "border-site-line bg-site-surface/70"
      : "border-white/[0.06] bg-white/[0.03]";

  return (
    <div
      role="radiogroup"
      aria-label="Tema de la interfaz"
      className={`inline-flex shrink-0 items-center gap-0.5 rounded-xl border p-0.5 ${shell} ${className}`}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        // Antes de hidratar no se sabe el tema guardado: ninguno se marca aún.
        const active = ready && theme === value;

        const state =
          variant === "site"
            ? active
              ? "bg-premium_pink/10 text-premium_pink"
              : "text-site-faint hover:bg-site-raised hover:text-site-text"
            : active
              ? "bg-dash_accent/[0.12] text-dash_accent"
              : "text-white/40 hover:bg-white/[0.06] hover:text-white/70";

        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`Tema ${label.toLowerCase()}`}
            title={`Tema ${label.toLowerCase()}`}
            onClick={() => setTheme(value)}
            className={`inline-flex items-center gap-1.5 rounded-[0.6rem] px-2.5 py-1.5 text-[0.75rem] font-medium transition-all duration-200 ${state}`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
