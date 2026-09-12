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
      },
    },
  },
  plugins: [],
};
export default config;
