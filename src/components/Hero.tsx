import { useState } from "react";
import { Fade } from "react-awesome-reveal";
import Image from "next/image";

type Platform =
  | "NETFLIX"
  | "DISNEY"
  | "PRIME"
  | "HBO"
  | "YOUTUBE"
  | "UNIVERSAL";

interface Service {
  label: string;
  href: string;
  id: number;
}

export default function Hero() {
  const [openMenu, setOpenMenu] = useState<Platform | null>(null);

  const servicesByPlatform: Record<Platform, Service[]> = {
    NETFLIX: [
      { label: "Actualiza hogar", href: "/update_home", id: 1 },
      {
        label: "Código temporal (estoy de viaje)",
        href: "/temporal_access",
        id: 2,
      },
      {
        label: "Código de inicio de sesión",
        href: "/session_netflix_code",
        id: 3,
      },
      {
        label: "Restablecimiento de contraseña",
        href: "/password_reset",
        id: 4,
      },
      {
        label: "Solicitud de enlace de inicio de sesión",
        href: "/new_session",
        id: 6,
      },
    ],
    DISNEY: [
      { label: "Código de inicio de sesión", href: "/session_code", id: 5 },
      { label: "Código de hogar", href: "/disney_home_code", id: 9 },
    ],
    PRIME: [
      { label: "Código de inicio de sesión", href: "/session_prime", id: 7 },
    ],
    HBO: [
      { label: "Código de inicio de sesión", href: "/session_hbo", id: 8 },
      {
        label: "Reestablecimiento de contraseña",
        href: "/restor_hbo_password",
        id: 9,
      },
    ],
    YOUTUBE: [
      { label: "Código de inicio de sesión", href: "/youtube_code", id: 10 },
    ],

    UNIVERSAL: [
      { label: "Código de activación", href: "/activation_code", id: 11 },
    ],
  };

  const platforms: { name: Platform; color: string }[] = [
    { name: "NETFLIX", color: "#f1054d" },
    { name: "DISNEY", color: "#65f1ff" },
    { name: "PRIME", color: "#8ff165" },
    { name: "HBO", color: "#f1c165" },
    { name: "YOUTUBE", color: "#ff0000" },
    { name: "UNIVERSAL", color: "#EBFF0D" },
  ];

  const toggleMenu = (platform: Platform) => {
    setOpenMenu((prev) => (prev === platform ? null : platform));
  };

  return (
    <section className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white pb-8 sm:py-20 px-4">
      <div className="container mx-auto">
        <Fade triggerOnce>
          <div className="text-center mb-8 sm:mb-16">
            <Image
              src="/images/accounts_logo.png"
              alt="Premiummm Logo"
              width={210}
              height={150}
              className="mx-auto"
            />
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl font-extrabold italic text-[#f1054d] drop-shadow-[0_0_15px_#f1054d]">
              Accounts Premiummm
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-white mt-2 sm:mt-4 max-w-2xl mx-auto px-4">
              Selecciona el servicio que deseas utilizar
            </p>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-2 sm:gap-4 md:gap-6">
            {platforms.map(({ name, color }) => (
              <div key={name} className="relative text-center">
                <button
                  onClick={() => toggleMenu(name)}
                  className="flex items-center justify-center gap-2 sm:gap-3 text-white text-sm sm:text-base md:text-lg font-semibold px-4 sm:px-5 md:px-7 py-3 sm:py-4 md:py-4 rounded-full bg-gray-800 hover:bg-gray-700 transition-all border-2 shadow-lg w-full sm:w-auto"
                  style={{ borderColor: color }}
                >
                  {name}
                  <svg
                    className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 ${
                      openMenu === name ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {openMenu === name && (
                  <div className="absolute left-1/2 -translate-x-1/2 z-20 mt-2 sm:mt-3 w-56 sm:w-64 bg-gray-900/95 border border-gray-600 rounded-xl shadow-xl backdrop-blur-md">
                    <ul className="divide-y divide-gray-700">
                      {servicesByPlatform[name].map((service) => (
                        <li key={service.id}>
                          <a
                            href={service.href}
                            className="block px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-center hover:bg-gray-800 transition-all"
                            style={{ color }}
                          >
                            {service.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Fade>
      </div>

      <style>{`
        .animate-fadeIn {
          animation: fadeIn 0.25s ease-in-out;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scaleY(0.95);
          }
          to {
            opacity: 1;
            transform: scaleY(1);
          }
        }
      `}</style>
    </section>
  );
}
