import Link from "next/link";

import SiteBackdrop from "@/components/site/SiteBackdrop";
import SiteHeader from "@/components/site/SiteHeader";
import { PLATFORMS, type Platform } from "@/lib/services-catalog";

/** Soporte del equipo, para cuando un trámite no da lo que se espera. */
const WHATSAPP_URL = "https://wa.me/573209902636";

export default function Home() {
  return (
    <div className="min-h-screen">
      <SiteBackdrop />
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
        <h1 className="text-[2.1rem] font-extrabold leading-[1.05] tracking-tight text-site-text sm:text-[2.7rem]">
          Códigos y accesos
        </h1>
        <p className="mt-3 max-w-[46ch] text-[1.05rem] leading-relaxed text-site-muted">
          Elige la plataforma y el trámite. Escribe el correo de la cuenta y te
          devolvemos el código listo para copiar.
        </p>

        <div className="mt-10 gap-5 sm:columns-2 lg:columns-3">
          {PLATFORMS.map((platform) => (
            <PlatformCard key={platform.id} platform={platform} />
          ))}
        </div>
      </main>
    </div>
  );
}

function PlatformCard({ platform }: { platform: Platform }) {
  return (
    <article className="mb-5 break-inside-avoid overflow-hidden rounded-2xl border border-site-line bg-site-surface/70 backdrop-blur-xl">
      <div className="flex items-center gap-2.5 border-b border-site-line px-5 py-3.5">
        <span
          aria-hidden
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: platform.color }}
        />
        <h2
          className="text-[1rem] font-bold tracking-tight"
          style={{ color: platform.color }}
        >
          {platform.name}
        </h2>
      </div>

      <ul>
        {platform.actions.map((action) => (
          <li key={action.slug} className="border-t border-site-line/50 first:border-t-0">
            <Link
              href={`/${action.slug}`}
              className="group flex items-start justify-between gap-3 px-5 py-3.5 transition hover:bg-white/[0.035]"
            >
              <span className="min-w-0">
                <span className="block text-[0.95rem] font-semibold text-site-text">
                  {action.title}
                </span>
                <span className="mt-1 block text-[0.8rem] leading-snug text-site-faint">
                  {action.description}
                </span>
              </span>
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                aria-hidden
                className="mt-1 size-4 shrink-0 text-site-faint transition group-hover:translate-x-0.5 group-hover:text-premium_pink"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m8 4 6 6-6 6" />
              </svg>
            </Link>
          </li>
        ))}
      </ul>
    </article>
  );
}
