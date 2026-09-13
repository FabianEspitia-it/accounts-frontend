"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(
          typeof data.error === "string"
            ? data.error
            : "No se pudo iniciar sesión",
          { theme: "dark" }
        );
        return;
      }

      toast.success("Bienvenido", { theme: "dark" });
      router.replace("/");
      router.refresh();
    } catch {
      toast.error("Error de conexión", { theme: "dark" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-black">
      {/* Capa de fondo explícita: evita que el Image con fill quede encima del formulario. */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <Image
          src="/images/gengar.jpg"
          alt=""
          fill
          className="object-cover"
          sizes="100vw"
          priority
          quality={100}
        />
        <div className="absolute inset-0 bg-black opacity-60" />
      </div>

      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-md rounded-2xl border-2 border-premium_pink bg-black/95 p-8 shadow-lg">
          <Image
            src="/images/premiummm-logo.png"
            alt="Accounts Premiummm"
            width={110}
            height={110}
            className="mx-auto mb-4"
          />
          <h1 className="mb-6 text-center text-2xl font-black italic text-premium_pink drop-shadow-[0_0_10px_#f1054d]">
            Iniciar sesión
          </h1>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <label className="block">
              <span className="mb-1 block text-sm text-premium_pink">Correo</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border-2 border-premium_pink bg-black px-3 py-2 text-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-premium_pink"
                placeholder="accounts@premiummm.com"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-premium_pink">
                Contraseña
              </span>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border-2 border-premium_pink bg-black px-3 py-2 text-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-premium_pink"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-lg bg-premium_pink py-3 font-semibold text-black transition hover:bg-premium_purple hover:text-white disabled:opacity-60"
            >
              {loading ? "Entrando…" : "Entrar"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
