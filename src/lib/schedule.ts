/**
 * Horario de acceso de los asesores.
 *
 * El backend guarda cada franja en minutos desde medianoche (hora de Colombia)
 * porque es lo que se puede comparar sin arrastrar husos. Aquí se traduce a
 * "HH:MM", que es lo que se escribe y se lee en el panel.
 *
 * Un asesor **sin franjas entra a cualquier hora**: es el valor por defecto y
 * el comportamiento que tenía la plataforma antes de que existiera el horario.
 */

/** Una franja: de `start_minute` a `end_minute` del día `weekday`. */
export type ScheduleSlot = {
  /** 0 = lunes … 6 = domingo, igual que en el backend. */
  weekday: number;
  start_minute: number;
  end_minute: number;
};

/** Índice 0 = lunes, para cuadrar con `weekday`. */
export const WEEKDAYS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
] as const;

/** Abreviatura para las etiquetas de la tabla, donde no cabe el nombre entero. */
export const WEEKDAYS_SHORT = [
  "Lun",
  "Mar",
  "Mié",
  "Jue",
  "Vie",
  "Sáb",
  "Dom",
] as const;

export const MINUTES_IN_DAY = 24 * 60;

/** 510 → "08:30". */
export function minuteToTime(minute: number): string {
  const hours = Math.floor(minute / 60);
  const minutes = minute % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** "08:30" → 510. `null` si no es una hora válida. */
export function timeToMinute(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 24 || minutes > 59) return null;

  const total = hours * 60 + minutes;
  // 24:00 es el final del día; más allá no existe.
  return total <= MINUTES_IN_DAY ? total : null;
}

/** Franjas de un día, ordenadas. */
export function slotsOfDay(
  slots: ScheduleSlot[],
  weekday: number
): ScheduleSlot[] {
  return slots
    .filter((slot) => slot.weekday === weekday)
    .sort((a, b) => a.start_minute - b.start_minute);
}

/**
 * Resumen de una línea para la tabla: agrupa los días que comparten el mismo
 * turno ("Lun–Vie 08:00-18:00") en vez de listar siete renglones iguales.
 */
export function describeSchedule(slots: ScheduleSlot[]): string {
  if (slots.length === 0) return "Sin restricción";

  // Firma del día: los días con la misma cadena se pintan juntos.
  const signatures = new Map<number, string>();
  for (let day = 0; day < WEEKDAYS.length; day += 1) {
    const ranges = slotsOfDay(slots, day);
    if (ranges.length === 0) continue;
    signatures.set(
      day,
      ranges
        .map((s) => `${minuteToTime(s.start_minute)}-${minuteToTime(s.end_minute)}`)
        .join(" y ")
    );
  }

  const parts: string[] = [];
  let runStart: number | null = null;
  let runEnd: number | null = null;
  let runSignature: string | null = null;

  const flush = () => {
    if (runStart === null || runEnd === null || runSignature === null) return;
    const label =
      runStart === runEnd
        ? WEEKDAYS_SHORT[runStart]
        : // Dos días seguidos se leen mejor con coma que con guion.
          runEnd - runStart === 1
          ? `${WEEKDAYS_SHORT[runStart]}, ${WEEKDAYS_SHORT[runEnd]}`
          : `${WEEKDAYS_SHORT[runStart]}–${WEEKDAYS_SHORT[runEnd]}`;
    parts.push(`${label} ${runSignature}`);
  };

  for (let day = 0; day < WEEKDAYS.length; day += 1) {
    const signature = signatures.get(day);
    if (signature === undefined) {
      flush();
      runStart = runEnd = runSignature = null;
      continue;
    }
    if (runSignature === signature && runEnd === day - 1) {
      runEnd = day;
      continue;
    }
    flush();
    runStart = day;
    runEnd = day;
    runSignature = signature;
  }
  flush();

  return parts.join(" · ");
}

/**
 * ¿El horario permite entrar en este momento? Solo para pintar el estado en la
 * tabla; quien decide de verdad es el backend.
 *
 * Se resuelve en hora de Colombia (UTC-5, sin horario de verano) y no con la
 * hora local del navegador: un administrador conectado desde otro huso vería
 * marcado "fuera de turno" a alguien que sí está trabajando.
 */
export function isWithinSchedule(
  slots: ScheduleSlot[],
  now: Date = new Date()
): boolean {
  if (slots.length === 0) return true;

  const colombia = new Date(now.getTime() - 5 * 60 * 60 * 1000);
  // getUTCDay() cuenta desde el domingo; `weekday` desde el lunes.
  const weekday = (colombia.getUTCDay() + 6) % 7;
  const minute = colombia.getUTCHours() * 60 + colombia.getUTCMinutes();

  return slots.some(
    (slot) =>
      slot.weekday === weekday &&
      slot.start_minute <= minute &&
      minute < slot.end_minute
  );
}
