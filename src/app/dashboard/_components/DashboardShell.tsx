"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ComponentType, type ReactNode, type SVGProps } from "react";

/*
 * Iconos: Heroicons v2 outline, los mismos que accounts-platform-frontend usa vía
 * `react-icons/hi2`. Van inline porque aquí no hay react-icons instalado y no vale
 * la pena sumar una dependencia por tres trazos.
 */
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

const UsersIcon = (props: IconProps) => (
  <HeroIcon
    {...props}
    d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
  />
);

const ComputerDesktopIcon = (props: IconProps) => (
  <HeroIcon
    {...props}
    d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25"
  />
);

const ClipboardDocumentCheckIcon = (props: IconProps) => (
  <HeroIcon
    {...props}
    d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0 1 18 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3 1.5 1.5 3-3.75"
  />
);

const ArrowRightOnRectangleIcon = (props: IconProps) => (
  <HeroIcon
    {...props}
    d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"
  />
);

const Bars3Icon = (props: IconProps) => (
  <HeroIcon {...props} d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
);

const XMarkIcon = (props: IconProps) => (
  <HeroIcon {...props} d="M6 18 18 6M6 6l12 12" />
);

type NavItem = {
  label: string;
  href: string;
  Icon: ComponentType<IconProps>;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Usuarios", href: "/dashboard/users", Icon: UsersIcon },
  { label: "Cuentas", href: "/dashboard/accounts", Icon: ComputerDesktopIcon },
  {
    label: "Solicitudes",
    href: "/dashboard/requests",
    Icon: ClipboardDocumentCheckIcon,
  },
];

export default function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="dashboard-root relative flex min-h-screen bg-[#07060e] text-white/90 antialiased">
      {/* Fondo atmosférico — mismo lenguaje que el login */}
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-[#07060e] [background-image:radial-gradient(ellipse_60%_50%_at_0%_50%,rgba(124,58,237,0.07),transparent_70%),radial-gradient(ellipse_50%_60%_at_85%_20%,rgba(255,0,85,0.05),transparent_60%),radial-gradient(ellipse_80%_80%_at_50%_110%,rgba(88,28,135,0.08),transparent_50%)]"
        aria-hidden
      />

      {/* Sidebar (desktop) */}
      <aside className="relative z-10 hidden w-60 shrink-0 flex-col border-r border-white/[0.06] bg-white/[0.02] backdrop-blur-sm md:flex">
        <SidebarContent
          isActive={isActive}
          onNavigate={() => {}}
          onLogout={logout}
          loggingOut={loggingOut}
        />
      </aside>

      {/* Sidebar (drawer móvil) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 animate-fade-in flex-col border-r border-white/[0.06] bg-[#0c0c0f] shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 rounded-lg p-1.5 text-white/30 transition hover:bg-white/[0.06] hover:text-white/60"
              aria-label="Cerrar menú"
            >
              <XMarkIcon className="size-5" />
            </button>
            <SidebarContent
              isActive={isActive}
              onNavigate={() => setMobileOpen(false)}
              onLogout={logout}
              loggingOut={loggingOut}
            />
          </aside>
        </div>
      )}

      {/* Columna principal: top bar + contenido */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] bg-[#07060e]/80 px-6 py-3 backdrop-blur-sm md:px-8 lg:px-10">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-1.5 text-white/40 transition hover:bg-white/[0.06] hover:text-white/70 md:hidden"
            aria-label="Abrir menú"
          >
            <Bars3Icon className="size-5" />
          </button>

          <div className="ml-auto flex items-center gap-1">
            <Link
              href="/"
              className="inline-flex items-center rounded-xl px-3 py-2 text-[0.8rem] font-medium text-white/50 transition-all duration-200 hover:bg-white/[0.06] hover:text-white/80"
            >
              Ir al sitio
            </Link>
            <button
              type="button"
              onClick={logout}
              disabled={loggingOut}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[0.8rem] font-medium text-white/50 transition-all duration-200 hover:bg-red-500/[0.08] hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowRightOnRectangleIcon className="size-4 shrink-0" />
              {loggingOut ? "Saliendo…" : "Cerrar sesión"}
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-6 md:p-8 lg:p-10">{children}</main>
      </div>
    </div>
  );
}

function SidebarContent({
  isActive,
  onNavigate,
  onLogout,
  loggingOut,
}: {
  isActive: (href: string) => boolean;
  onNavigate: () => void;
  onLogout: () => void;
  loggingOut: boolean;
}) {
  return (
    <>
      {/* Marca */}
      <div className="border-b border-white/[0.06] px-5 py-3">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-3"
        >
          <div className="relative size-8 shrink-0 overflow-hidden rounded-lg ring-1 ring-white/[0.08]">
            <Image
              src="/images/premiummm-logo.png"
              alt=""
              width={32}
              height={32}
              className="size-full object-contain"
              priority
            />
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight text-white">
              Accounts
            </p>
            <p className="bg-gradient-to-r from-[#ff0055] to-violet-400 bg-clip-text text-[0.65rem] font-bold uppercase tracking-[0.08em] text-transparent">
              Premiummm
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-white/20">
          Navegación
        </p>
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.8rem] font-medium transition-all duration-200 ${
                active
                  ? "bg-[#ff0055]/[0.08] text-white shadow-[inset_0_0_0_1px_rgba(255,0,85,0.15)]"
                  : "text-white/40 hover:bg-white/[0.04] hover:text-white/70"
              }`}
            >
              {active && (
                <span
                  className="absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-[#ff0055] to-violet-500 shadow-[0_0_8px_rgba(255,0,85,0.5)]"
                  aria-hidden
                />
              )}
              <span
                className={
                  active
                    ? "text-[#ff0055]"
                    : "text-white/25 transition-colors group-hover:text-white/50"
                }
              >
                <Icon className="size-4 shrink-0" />
              </span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Cerrar sesión (sólo visible en el drawer; en desktop vive en la top bar) */}
      <div className="border-t border-white/[0.06] px-3 py-3 md:hidden">
        <button
          type="button"
          onClick={onLogout}
          disabled={loggingOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[0.8rem] font-medium text-white/40 transition-all duration-200 hover:bg-red-500/[0.08] hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowRightOnRectangleIcon className="size-4 shrink-0 text-white/25" />
          {loggingOut ? "Saliendo…" : "Cerrar sesión"}
        </button>
      </div>

      {/* Pie */}
      <div className="border-t border-white/[0.06] px-5 py-4">
        <p className="text-[0.6rem] font-medium uppercase tracking-[0.08em] text-white/15">
          &copy; 2026 Accounts Premiummm
        </p>
      </div>
    </>
  );
}
