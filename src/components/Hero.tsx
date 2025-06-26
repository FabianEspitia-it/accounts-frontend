import { Fade } from "react-awesome-reveal";

export default function Hero() {
  const services = [
    { label: "Actualiza hogar (NETFLIX)", href: "/update_home", id: 1 },
    {
      label: "Código temporal (estoy de viaje) (NETFLIX)",
      href: "/temporal_access",
      id: 2,
    },
    {
      label: "Código de inicio de sesión (NETFLIX)",
      href: "/session_netflix_code",
      id: 3,
    },
    {
      label: "Restablecimiento de contraseña (NETFLIX)",
      href: "/password_reset",
      id: 4,
    },
    {
      label: "Código de inicio de sesión (DISNEY+)",
      href: "/session_code",
      id: 5,
    },
    {
      label: "Solicitud de enlace de inicio de sesión (NETFLIX)",
      href: "/new_session",
      id: 6,
    },
  ];

  return (
    <section className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white py-16">
      <div className="container mx-auto px-4">
        <Fade triggerOnce>
          <div className="text-center mb-14">
            <h2 className="text-5xl md:text-6xl font-extrabold italic text-[#f1054d] drop-shadow-[0_0_10px_#f1054d]">
              Accounts Premiummm
            </h2>
            <p className="text-lg md:text-xl text-gray-300 mt-4 max-w-xl mx-auto">
              Selecciona el servicio que deseas utilizar
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {services.map((service) => {
              const isNetflix = service.label.includes("NETFLIX");

              const hoverBorderClass = isNetflix
                ? "hover:border-[#f1054d]"
                : "hover:border-[#65f1ff]";
              const hoverShadowClass = isNetflix
                ? "hover:shadow-[#f1054d]/40"
                : "hover:shadow-[#65f1ff]/40";
              const hoverTextClass = isNetflix
                ? "group-hover:text-[#f1054d]"
                : "group-hover:text-[#65f1ff]";
              const hoverBarClass = isNetflix
                ? "group-hover:bg-[#f1054d]"
                : "group-hover:bg-[#65f1ff]";

              return (
                <a
                  key={service.id}
                  href={service.href}
                  className={`relative group p-6 rounded-2xl transition-all duration-300 ease-in-out
                    bg-gradient-to-br from-gray-800/80 to-gray-900 border border-gray-700
                    shadow-md hover:-translate-y-1 ${hoverBorderClass} ${hoverShadowClass}`}
                  aria-label={service.label}
                >
                  <div className="h-full flex flex-col justify-center items-center text-center space-y-4">
                    <h3
                      className={`text-lg font-semibold text-white transition-colors duration-300 ${hoverTextClass}`}
                    >
                      {service.label}
                    </h3>
                    <div
                      className={`w-full h-1 rounded-full bg-gray-700 transition-all duration-300 ${hoverBarClass}`}
                    />
                  </div>
                </a>
              );
            })}
          </div>
        </Fade>
      </div>
    </section>
  );
}
