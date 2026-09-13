"use client";

import PhoneInput, {
  formatPhoneNumberIntl,
  isPossiblePhoneNumber,
} from "react-phone-number-input";
import es from "react-phone-number-input/locale/es.json";
import "react-phone-number-input/style.css";

/**
 * Campo de teléfono con selector de país. Siempre entrega el valor en E.164
 * (+573001234567), que es como el backend guarda `users.phone_number`.
 *
 * El aspecto (borde, fondo, foco) llega por `className`, porque el dashboard y
 * el login usan paletas distintas; lo interno se estiliza en globals.css.
 */
export default function PhoneNumberField({
  value,
  onChange,
  className,
  placeholder = "300 123 4567",
  autoFocus,
  disabled,
  name,
  autoComplete,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  name?: string;
  autoComplete?: string;
}) {
  return (
    <PhoneInput
      international
      defaultCountry="CO"
      labels={es}
      // Sin esto el usuario puede borrar el "+57" y dejar el número ambiguo.
      countryCallingCodeEditable={false}
      value={value || undefined}
      onChange={(next) => onChange(next ?? "")}
      className={className}
      placeholder={placeholder}
      autoFocus={autoFocus}
      disabled={disabled}
      name={name}
      autoComplete={autoComplete}
    />
  );
}

/**
 * Validación previa al envío. Con los metadatos "min" que trae el paquete por
 * defecto, `isPossiblePhoneNumber` (longitud + prefijo) es la comprobación
 * fiable; `isValidPhoneNumber` necesitaría los metadatos "max".
 */
export function isPhoneNumberUsable(value: string): boolean {
  return isPossiblePhoneNumber(value);
}

/** "+573001234567" → "+57 300 123 4567". Devuelve el original si no lo reconoce. */
export function formatPhoneNumber(value: string): string {
  return formatPhoneNumberIntl(value) || value;
}
