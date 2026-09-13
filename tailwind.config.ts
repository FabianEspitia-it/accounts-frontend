import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        principal_blue: "#075480",
        /** Superficie base del panel y del login (negro de la marca). */
        panel_black: "#0a0a0a",
        /** Acento principal de Accounts Premiummm. */
        premium_pink: "#f1054d",
        /** Acento secundario (hover / estados). */
        premium_purple: "#4b2c98",
        /** Lienzo del dashboard — mismo valor que accounts-platform-frontend. */
        dash_bg: "#07060e",
        /** Superficie de modales del dashboard. */
        dash_panel: "#0c0c0f",
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
      },
      animation: {
        "fade-in": "fade-in 0.5s ease-out both",
        "slide-up": "slide-up 0.45s ease-out both",
        "slide-down": "slide-down 0.3s cubic-bezier(0.16, 1, 0.3, 1) both",
        "scale-in": "scale-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) both",
        shimmer: "shimmer 2.4s ease-in-out infinite",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
        "count-up": "count-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
      },
    },
  },
  plugins: [],
};
export default config;
