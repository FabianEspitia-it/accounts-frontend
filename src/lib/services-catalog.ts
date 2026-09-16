/**
 * Catálogo de plataformas y trámites.
 *
 * Es la única fuente de verdad: el inicio pinta esta lista y cada página de
 * trámite se identifica con su `slug`, así que el título que se ve en la
 * tarjeta y el que se ve dentro del trámite no pueden desincronizarse.
 */

export type PlatformId =
  | "netflix"
  | "disney"
  | "prime"
  | "hbo"
  | "youtube"
  | "universal"
  | "spotify"
  | "crunchyroll";

/** Qué devuelve el trámite: cambia cómo se muestra el resultado. */
export type ServiceResultKind = "code" | "link";

export type ServiceAction = {
  /** Coincide con la carpeta en `src/app`, sin la barra. */
  slug: string;
  /** Lo que el revendedor busca, escrito como lo diría. */
  title: string;
  /** Qué hace el trámite, en una línea. */
  description: string;
  kind: ServiceResultKind;
};

export type Platform = {
  id: PlatformId;
  /** Se pinta tal cual: es el nombre de la marca, no una etiqueta. */
  name: string;
  /** Color de la marca; identifica la tarjeta y el trámite. */
  color: string;
  actions: ServiceAction[];
};

export const PLATFORMS: Platform[] = [
  {
    id: "netflix",
    name: "Netflix",
    color: "#ff4d4d",
    actions: [
      {
        slug: "netflix_update_home",
        title: "Actualizar hogar",
        description: "Enlace para dejar este televisor como hogar de la cuenta.",
        kind: "link",
      },
      {
        slug: "netflix_temporal_access",
        title: "Código de viaje",
        description:
          "Acceso temporal para ver fuera del hogar, por unos días.",
        kind: "link",
      },
      {
        slug: "netflix_session_code",
        title: "Código de inicio de sesión",
        description: "El código que Netflix envió al correo de la cuenta.",
        kind: "code",
      },
      {
        slug: "netflix_password_reset",
        title: "Restablecer contraseña",
        description: "Enlace para cambiar la contraseña de la cuenta.",
        kind: "link",
      },
      {
        slug: "netflix_new_session",
        title: "Enlace de inicio de sesión",
        description: "Entra sin escribir la contraseña, desde el enlace.",
        kind: "link",
      },
    ],
  },
  {
    id: "disney",
    name: "Disney+",
    color: "#5b9cff",
    actions: [
      {
        slug: "disney_session_code",
        title: "Código de inicio de sesión",
        description: "El código de 6 dígitos que pide Disney+ al entrar.",
        kind: "code",
      },
      {
        slug: "disney_home_code",
        title: "Código de hogar",
        description: "El código para confirmar el hogar de la cuenta.",
        kind: "code",
      },
    ],
  },
  {
    id: "prime",
    name: "Prime Video",
    color: "#3fd8e8",
    actions: [
      {
        slug: "prime_session_code",
        title: "Código de inicio de sesión",
        description: "El código que Amazon envió al correo de la cuenta.",
        kind: "code",
      },
    ],
  },
  {
    id: "hbo",
    name: "HBO Max",
    color: "#b98cff",
    actions: [
      {
        slug: "hbo_session_code",
        title: "Código de inicio de sesión",
        description: "El código que HBO Max envió al correo de la cuenta.",
        kind: "code",
      },
      {
        slug: "hbo_reset_password",
        title: "Restablecer contraseña",
        description: "Enlace para cambiar la contraseña de la cuenta.",
        kind: "link",
      },
    ],
  },
  {
    id: "youtube",
    name: "YouTube",
    color: "#ff7b72",
    actions: [
      {
        slug: "youtube_session_code",
        title: "Código de inicio de sesión",
        description: "El código de verificación de la cuenta de Google.",
        kind: "code",
      },
    ],
  },
  {
    id: "universal",
    name: "Universal+",
    color: "#e2f04a",
    actions: [
      {
        slug: "universal_activation_code",
        title: "Código de activación",
        description: "El código para activar el dispositivo en Universal+.",
        kind: "code",
      },
    ],
  },
  {
    id: "crunchyroll",
    name: "Crunchyroll",
    color: "#f47521",
    actions: [
      {
        slug: "crunchyroll_link",
        title: "Enlace de inicio de sesión",
        description: "Entra a Crunchyroll sin escribir la contraseña.",
        kind: "link",
      },
    ],
  },
];

/**
 * Spotify sigue en el catálogo pero fuera de `PLATFORMS`: su página existe y
 * funciona, simplemente no se ofrece desde el inicio.
 */
export const HIDDEN_PLATFORMS: Platform[] = [
  {
    id: "spotify",
    name: "Spotify",
    color: "#1ed760",
    actions: [
      {
        slug: "spotify_session_code",
        title: "Código de inicio de sesión",
        description: "El código que Spotify envió al correo de la cuenta.",
        kind: "code",
      },
    ],
  },
];

type ResolvedAction = {
  platform: Platform;
  action: ServiceAction;
};

const BY_SLUG = new Map<string, ResolvedAction>(
  [...PLATFORMS, ...HIDDEN_PLATFORMS].flatMap((platform) =>
    platform.actions.map(
      (action) => [action.slug, { platform, action }] as const
    )
  )
);

/** Devuelve plataforma + trámite a partir del slug de la ruta. */
export function findService(slug: string): ResolvedAction {
  const found = BY_SLUG.get(slug);
  if (!found) {
    throw new Error(`Trámite desconocido: ${slug}`);
  }
  return found;
}
