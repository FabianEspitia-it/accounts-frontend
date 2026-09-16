import type { Metadata } from "next";
import { Archivo, Geist, Geist_Mono, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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
    <html
      lang="es"
      className={`${archivo.variable} ${jetbrainsMono.variable} ${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="bg-site-bg font-sans text-site-text antialiased">
        <ToastContainer
          theme="dark"
          position="top-center"
          autoClose={4000}
          newestOnTop
          closeOnClick
        />

        {children}
      </body>
    </html>
  );
}
