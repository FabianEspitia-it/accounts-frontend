import type { Metadata } from "next";
import { Geist, Geist_Mono, Poppins } from "next/font/google";
import "./globals.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: "500",
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
  description: "Las cuentas más premiummm del parche",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body className={poppins.className}>
        <ToastContainer />

        {children}
      </body>
    </html>
  );
}
