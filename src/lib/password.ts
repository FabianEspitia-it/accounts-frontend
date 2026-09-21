/**
 * Contraseñas de entrega: las que el administrador genera y le dicta o le pega
 * al revendedor por WhatsApp.
 *
 * Son cortas a propósito —cuatro caracteres, sin mayúsculas— porque se
 * comunican a mano y una mayúscula perdida es un intento de login fallido y una
 * llamada. No son contraseñas definitivas: quien las use debería cambiarlas.
 */

/** Minúsculas y dígitos. Sin mayúsculas: se pierden al dictar. */
const PASSWORD_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

/** Largo de lo que genera el botón "Generar". */
export const GENERATED_PASSWORD_LENGTH = 4;

/** Mínimo que aceptan los formularios y el backend. */
export const MIN_PASSWORD_LENGTH = 4;

/** Contraseña aleatoria en minúsculas y dígitos. */
export function generatePassword(
  length: number = GENERATED_PASSWORD_LENGTH
): string {
  const alphabet = PASSWORD_ALPHABET;
  // 2^32 no es múltiplo de 36: tomar el módulo a secas haría salir la "a" más
  // a menudo que la "z". Se descartan los valores del sobrante y se vuelve a
  // sortear, que es lo que mantiene el reparto parejo.
  const limit = Math.floor(0x100000000 / alphabet.length) * alphabet.length;

  const chars: string[] = [];
  const buffer = new Uint32Array(1);
  while (chars.length < length) {
    crypto.getRandomValues(buffer);
    if (buffer[0] >= limit) continue;
    chars.push(alphabet[buffer[0] % alphabet.length]);
  }

  return chars.join("");
}
