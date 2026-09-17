import type { Metadata } from "next";
import { Archivo, Geist, Geist_Mono, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "react-toastify/dist/ReactToastify.css";
import Toasts from "@/components/toasts";
import { ThemeProvider } from "@/components/theme-provider";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

/*
 * Archivo es la voz del sitio: una grotesca ancha y firme, que aguanta el
 * tamaño de los titulares sin el aire redondeado y publicitario de una
 * geométrica.
 */
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
});

/*
 * Los códigos y enlaces van en monoespaciada: no es un adorno de "dato", es
 * que se leen carácter a carácter y se dictan por WhatsApp, así que el 0 tiene
 * que distinguirse de la O.
 */
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

/*
 * Geist sólo lo usa el dashboard (ver `.dashboard-root` en globals.css), pero las
 * variables tienen que vivir en <html> para que también apliquen a los modales.
 * `preload: false` evita que el sitio público descargue fuentes que no pinta.
 */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  title: "Accounts Premiummm",
  description: "Códigos y accesos de tus cuentas de streaming, al instante.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // `suppressHydrationWarning`: el script de abajo escribe `data-theme` y
    // `style.color-scheme` en <html> antes de que React hidrate, así que el
    // marcado del servidor y el del cliente no coinciden a propósito.
    <html
      lang="es"
      suppressHydrationWarning
      className={`${archivo.variable} ${jetbrainsMono.variable} ${geistSans.variable} ${geistMono.variable}`}
    >
      <head>
        {/*
          Síncrono y antes del primer pintado: si el tema se aplicara desde
          React, a quien tiene el claro guardado le daría un fogonazo oscuro en
          cada carga.
        */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="bg-site-bg font-sans text-site-text antialiased">
        <ThemeProvider>
          <Toasts />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
