import Image from "next/image";
import Link from "next/link";

import LogoutButton from "@/components/LogoutButton";

/**
 * Barra superior del sitio. Deliberadamente corta: el trabajo está debajo, no
 * aquí, así que solo lleva la marca (que vuelve al inicio) y la salida.
 */
export default function SiteHeader() {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-site-line/60 px-5 py-4 sm:px-8">
      <Link
        href="/"
        className="group inline-flex items-center gap-3 rounded-xl outline-none"
      >
        <Image
          src="/images/premiummm-logo.png"
          alt=""
          width={36}
          height={36}
          className="h-9 w-9 object-contain"
        />
        <span className="text-[1.05rem] font-bold tracking-tight text-premium_pink transition group-hover:text-[#ff3d72]">
          Accounts Premiummm
        </span>
      </Link>

      <LogoutButton />
    </header>
  );
}
