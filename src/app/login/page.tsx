"use client";

import Image from "next/image";
import { FormEvent, ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import PhoneNumberField, {
  isPhoneNumberUsable,
} from "@/components/PhoneNumberField";
import SiteBackdrop from "@/components/site/SiteBackdrop";
import { PANEL } from "@/components/site/tokens";

const WHATSAPP_URL = "https://wa.me/573209902636";

type LoginMode = "email" | "phone";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function toggleMode() {
    setMode((prev) => (prev === "email" ? "phone" : "email"));
    setErrorMsg(null);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);

    const identifier = mode === "phone" ? phone.trim() : email.trim();
    if (!identifier) {
      setErrorMsg(
        mode === "phone" ? "Escribe tu número." : "Escribe tu correo."
      );
      return;
    }
    if (mode === "phone" && !isPhoneNumberUsable(identifier)) {
      setErrorMsg("Ese número no está completo. Revisa el país y los dígitos.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMsg(
          res.status === 401
            ? `Ese ${
                mode === "phone" ? "número" : "correo"
              } y esa contraseña no coinciden.`
            : typeof data.error === "string"
              ? data.error
              : "No pudimos entrar. Inténtalo de nuevo en un momento."
        );
        return;
      }

      toast.success("Listo, ya estás dentro.");
      router.replace("/");
      router.refresh();
    } catch {
      setErrorMsg("No hay conexión con el servidor. Revisa tu internet.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SiteBackdrop />

      <main className="flex min-h-screen flex-col items-center justify-center px-5 py-12">
        <div className="w-full max-w-[25rem]">
          <div className={`p-7 sm:p-8 ${PANEL}`}>
            <div className="flex items-center gap-2.5">
              <Image
                src="/images/premiummm-logo.png"
                alt=""
                width={28}
                height={28}
                priority
                className="h-7 w-7 object-contain"
              />
              <span className="text-[0.9rem] font-bold tracking-tight text-premium_pink">
                Accounts Premiummm
              </span>
            </div>

            <h1 className="mt-6 text-[1.7rem] font-extrabold leading-[1.15] tracking-tight text-site-text">
              Entra a tu cuenta
            </h1>
            <p className="mt-2 text-[0.92rem] leading-relaxed text-site-muted">
              Usa el {mode === "phone" ? "número" : "correo"} con el que te
              registraron.
            </p>

            <form onSubmit={onSubmit} className="mt-7">
              {/*
               * Los dos campos son un solo objeto, no dos cajas sueltas:
               * comparten borde y se separan con una línea interior, y la
               * etiqueta va dentro, encima del texto, para que nada quede
               * huérfano arriba del campo.
               */}
              <div className="divide-y divide-site-line overflow-hidden rounded-xl border border-site-line bg-site-raised/40 transition focus-within:border-premium_pink/55 focus-within:shadow-[0_0_0_3px_rgba(241,5,77,0.11)]">
                {mode === "email" ? (
                  <Field label="Correo" htmlFor="login-email">
                    <input
                      id="login-email"
                      type="email"
                      name="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      spellCheck={false}
                      required
                      autoFocus
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tucorreo@correo.com"
                      className={INNER_INPUT}
                    />
                  </Field>
                ) : (
                  <Field label="Número">
                    <PhoneNumberField
                      value={phone}
                      onChange={setPhone}
                      className="w-full text-[0.95rem] leading-6 text-site-text"
                      name="phone"
                      autoComplete="tel"
                    />
                  </Field>
                )}

                <Field label="Contraseña" htmlFor="login-password">
                  <div className="flex items-center gap-2">
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Tu contraseña"
                      className={INNER_INPUT}
                    />
                    {/* `-mr-1.5` lo mete en el aire del propio campo: sin esto
                        queda pegado al borde derecho del grupo. */}
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={
                        showPassword
                          ? "Ocultar contraseña"
                          : "Mostrar contraseña"
                      }
                      className="-mr-1.5 shrink-0 rounded-md p-1.5 text-site-faint transition hover:bg-white/[0.06] hover:text-site-text"
                    >
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </Field>
              </div>

              {errorMsg && (
                <p
                  role="alert"
                  className="mt-3.5 flex items-start gap-2 text-[0.85rem] leading-relaxed text-[#ff8a9e]"
                >
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden
                    className="mt-px size-4 shrink-0"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm0 3.5a.9.9 0 0 1 .9.9v4.2a.9.9 0 1 1-1.8 0V6.4a.9.9 0 0 1 .9-.9Zm0 8.9a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-premium_pink text-[0.95rem] font-semibold text-white transition hover:bg-[#ff2464] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:bg-premium_pink"
              >
                {loading && (
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden
                    className="size-4 animate-spin"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeOpacity="0.3"
                    />
                    <path
                      d="M21 12a9 9 0 0 0-9-9"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
                {loading ? "Entrando…" : "Entrar"}
              </button>

              {/*
               * Cambiar de correo a número es un camino alterno, no una
               * decisión que haya que tomar antes de empezar: por eso es un
               * enlace y no un conmutador que compite con los campos.
               */}
              <button
                type="button"
                onClick={toggleMode}
                className="mt-4 text-[0.88rem] font-medium text-site-muted underline-offset-4 transition hover:text-site-text hover:underline"
              >
                {mode === "email"
                  ? "Entrar con mi número"
                  : "Entrar con mi correo"}
              </button>
            </form>
          </div>

          <p className="mt-5 text-center text-[0.85rem] leading-relaxed text-site-faint">
            ¿No puedes entrar?{" "}
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-site-muted underline-offset-4 hover:text-site-text hover:underline"
            >
              Escríbenos por WhatsApp
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}

/** Input sin caja propia: la caja es el grupo que lo contiene. */
const INNER_INPUT =
  "site-field w-full min-w-0 border-0 bg-transparent p-0 text-[0.95rem] leading-6 text-site-text placeholder:text-site-faint/60";

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="px-3.5 py-2.5 transition focus-within:bg-white/[0.025]">
      <label
        htmlFor={htmlFor}
        className="mb-1 block text-[0.7rem] font-medium leading-none text-site-faint"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      aria-hidden
      className="size-[1.1rem]"
    >
      <path d="M2 10c1-2 4-5 8-5s7 3 8 5c-1 2-4 5-8 5s-7-3-8-5Z" />
      <circle cx="10" cy="10" r="2.5" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      aria-hidden
      className="size-[1.1rem]"
    >
      <path
        strokeLinecap="round"
        d="M3 3l14 14M8.2 8.3a2.5 2.5 0 0 0 3.5 3.5M6.5 5.6A8.3 8.3 0 0 1 10 5c4 0 7 3 8 5a11 11 0 0 1-2.6 3.2M4.6 7.1A11.4 11.4 0 0 0 2 10c1 2 4 5 8 5 .9 0 1.7-.15 2.5-.4"
      />
    </svg>
  );
}
