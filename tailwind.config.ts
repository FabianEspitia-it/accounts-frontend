import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";
import plugin from "tailwindcss/plugin";

/**
 * Todo color que cambie entre temas se declara como canal RGB en una variable
 * y se compone aquí con `<alpha-value>`. Así `bg-site-surface/80` o
 * `text-white/25` siguen funcionando exactamente igual: Tailwind pone la
 * opacidad y la variable pone el color, que es lo único que cambia al pasar de
 * oscuro a claro (ver `globals.css`).
 */
const themed = (variable: string) => `rgb(var(${variable}) / <alpha-value>)`;

/**
 * Tonos de estado usados como TEXTO (`text-red-300`, `text-emerald-400`…).
 * Están elegidos para brillar sobre negro y sobre blanco se quedan entre 1,5:1
 * y 2,5:1, así que en claro bajan a su equivalente oscuro.
 *
 * Los tonos 500 no entran aquí: sólo se usan como fondo o anillo con opacidad
 * (`bg-red-500/[0.08]`, `ring-emerald-500/30`), y al 8-30 % dan un tinte que
 * funciona igual sobre los dos lienzos.
 */
const stateColors = {
  red: {
    ...colors.red,
    200: themed("--c-red-200"),
    300: themed("--c-red-300"),
    400: themed("--c-red-400"),
  },
  emerald: {
    ...colors.emerald,
    300: themed("--c-emerald-300"),
    400: themed("--c-emerald-400"),
  },
  amber: { ...colors.amber, 200: themed("--c-amber-200") },
  sky: {
    ...colors.sky,
    200: themed("--c-sky-200"),
    300: themed("--c-sky-300"),
  },
  fuchsia: { ...colors.fuchsia, 300: themed("--c-fuchsia-300") },
  rose: { ...colors.rose, 300: themed("--c-rose-300") },
  purple: { ...colors.purple, 300: themed("--c-purple-300") },
  orange: { ...colors.orange, 300: themed("--c-orange-300") },
  green: { ...colors.green, 300: themed("--c-green-300") },
  yellow: { ...colors.yellow, 200: themed("--c-yellow-200") },
  blue: { ...colors.blue, 300: themed("--c-blue-300") },
};

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        ...stateColors,
        background: "var(--background)",
        foreground: "var(--foreground)",
        principal_blue: "#075480",
        /** Superficie base del panel y del login (negro de la marca). */
        panel_black: "#0a0a0a",

        /*
         * El dashboard está escrito sobre blanco (`text-white/25`,
         * `bg-white/[0.03]`, `border-white/[0.06]`…). Redefinir aquí `white`
         * como variable es lo que permite que en tema claro esas mismas ~200
         * utilidades pasen a pintar tinta oscura, sin un `dark:` por clase.
         *
         * `black` no se toca: los velos de modal (`bg-black/70`) son oscuros
         * en los dos temas.
         */
        white: themed("--ink-rgb"),

        /** Acento principal de Accounts Premiummm. */
        premium_pink: themed("--premium-pink-rgb"),
        /** Rosa del hover y de los mensajes de error sobre el acento. */
        premium_pink_hover: themed("--premium-pink-hover-rgb"),
        premium_pink_soft: themed("--premium-pink-soft-rgb"),
        /** Acento secundario (hover / estados). */
        premium_purple: "#4b2c98",
        /** Lienzo del dashboard — mismo valor que accounts-platform-frontend. */
        dash_bg: themed("--dash-bg-rgb"),
        /** Superficie de modales del dashboard. */
        dash_panel: themed("--dash-panel-rgb"),
        /** Acento del dashboard (#ff0055 en oscuro), distinto del del sitio. */
        dash_accent: themed("--dash-accent-rgb"),

        /*
         * Sitio público. El negro tira a violeta (viene de la ilustración de
         * fondo), no es un gris neutro: es lo que mantiene el aire de la marca
         * cuando se le quita el brillo de neón a todo lo demás. En claro se
         * conserva ese mismo sesgo violeta, sólo que hacia el blanco.
         */
        site: {
          bg: themed("--site-bg-rgb"),
          surface: themed("--site-surface-rgb"),
          raised: themed("--site-raised-rgb"),
          line: themed("--site-line-rgb"),
          /* Escalera de texto: 15.9:1 / 8.6:1 / 5.4:1 sobre `bg`, toda AA. */
          text: themed("--site-text-rgb"),
          muted: themed("--site-muted-rgb"),
          faint: themed("--site-faint-rgb"),
        },
      },
      fontFamily: {
        sans: ["var(--font-archivo)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: [
          "var(--font-jetbrains-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "monospace",
        ],
      },
      /*
       * Animaciones del dashboard. En accounts-platform-frontend viven en
       * `@theme inline` (Tailwind v4); aquí se replican como keyframes de v3
       * para que `animate-fade-in` y compañía resuelvan igual.
       */
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-down": {
          from: { opacity: "0", transform: "translateY(-8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
        "count-up": {
          from: { opacity: "0", transform: "translateY(6px) scale(0.95)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        /* Llegada del resultado: el único momento con movimiento del sitio. */
        "result-in": {
          from: { opacity: "0", transform: "translateY(10px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.5s ease-out both",
        "slide-up": "slide-up 0.45s ease-out both",
        "slide-down": "slide-down 0.3s cubic-bezier(0.16, 1, 0.3, 1) both",
        "scale-in": "scale-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) both",
        shimmer: "shimmer 2.4s ease-in-out infinite",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
        "count-up": "count-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
        "result-in": "result-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) both",
      },
    },
  },
  plugins: [
    /*
     * `light:` — el reverso de `dark:`. Casi todo el tema claro sale solo de
     * reinterpretar `--ink-rgb` (ver globals.css), pero hay decisiones que no
     * son un color con otra opacidad sino otra idea: en oscuro una tarjeta se
     * eleva aclarándose sobre el lienzo, y en claro se eleva volviéndose blanca
     * sobre un lienzo teñido, con sombra. Eso necesita decirse por clase.
     */
    plugin(({ addVariant }) => {
      addVariant("light", '&:is(html[data-theme="light"] *)');
    }),
  ],
};
export default config;
