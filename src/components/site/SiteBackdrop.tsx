import Image from "next/image";

/**
 * Fondo del sitio.
 *
 * La ilustración de la marca no se tapa con un velo negro plano (eso solo la
 * enturbia): se deja entrar por la esquina inferior derecha, muy oscurecida y
 * desenfocada, y se desvanece hacia el texto. Así aporta atmósfera donde no
 * hay contenido y desaparece donde sí lo hay.
 */
export default function SiteBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-site-bg"
    >
      <Image
        src="/images/gengar.jpg"
        alt=""
        fill
        priority
        quality={85}
        sizes="100vw"
        className="site-backdrop-image scale-110 object-cover object-center blur-[3px] [mask-image:radial-gradient(75%_75%_at_82%_88%,#000_0%,transparent_72%)]"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-site-bg via-site-bg/92 to-site-bg/70" />
      <div className="absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-premium_purple/25 blur-[120px]" />
      <div className="absolute -bottom-48 right-[-10rem] h-[30rem] w-[30rem] rounded-full bg-premium_pink/12 blur-[130px]" />
    </div>
  );
}
