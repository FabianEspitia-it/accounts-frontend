"use client";

import { ToastContainer } from "react-toastify";
import { useTheme } from "@/components/theme-provider";

/**
 * react-toastify pinta su propio esqueleto de color a partir de `theme`, así
 * que tiene que seguir al de la app o los avisos salen en negro sobre el
 * sitio claro.
 */
export default function Toasts() {
  const { theme } = useTheme();

  return (
    <ToastContainer
      theme={theme}
      position="top-center"
      autoClose={4000}
      newestOnTop
      closeOnClick
    />
  );
}
