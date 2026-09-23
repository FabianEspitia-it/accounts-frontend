"use client";

import { useMemo, useState } from "react";
import { toast } from "react-toastify";

import {
  MINUTES_IN_DAY,
  ScheduleSlot,
  WEEKDAYS,
  minuteToTime,
  timeToMinute,
} from "@/lib/schedule";
import Modal from "../_components/Modal";
import { BTN_ACCENT, BTN_GHOST, BTN_NEUTRAL } from "../_components/ui";

/**
 * Un tramo mientras se edita. Las horas viven como texto porque el input las
 * entrega así y, a medio escribir ("8:"), todavía no son un número de minutos.
 */
type DraftSlot = {
  /** Solo para la key de React: los tramos no tienen id hasta que se guardan. */
  key: string;
  weekday: number;
  start: string;
  end: string;
};

/** Turno con el que arranca un día que se activa: la jornada más común. */
const DEFAULT_START = "08:00";
const DEFAULT_END = "18:00";

let draftCounter = 0;
function nextKey(): string {
  draftCounter += 1;
  return `slot-${draftCounter}`;
}

function toDrafts(slots: ScheduleSlot[]): DraftSlot[] {
  return slots
    .slice()
    .sort((a, b) => a.weekday - b.weekday || a.start_minute - b.start_minute)
    .map((slot) => ({
      key: nextKey(),
      weekday: slot.weekday,
      start: minuteToTime(slot.start_minute),
      end: minuteToTime(slot.end_minute),
    }));
}

/**
 * Valida y convierte a lo que espera el backend.
 *
 * Devuelve el primer problema en vez de una lista: el formulario es corto y
 * arreglar uno suele arreglar el resto.
 */
function toPayload(
  drafts: DraftSlot[]
): { slots: ScheduleSlot[] } | { error: string } {
  const slots: ScheduleSlot[] = [];

  for (const draft of drafts) {
    const start = timeToMinute(draft.start);
    const end = timeToMinute(draft.end);
    const day = WEEKDAYS[draft.weekday];

    if (start === null || end === null) {
      return { error: `Revisa las horas del ${day.toLowerCase()}` };
    }
    if (start >= end) {
      return {
        error: `El ${day.toLowerCase()} termina antes de empezar`,
      };
    }
    if (end > MINUTES_IN_DAY) {
      return { error: `El ${day.toLowerCase()} se pasa de la medianoche` };
    }
    slots.push({ weekday: draft.weekday, start_minute: start, end_minute: end });
  }

  // Mismo criterio que el backend: dos tramos del mismo día no pueden pisarse.
  for (let day = 0; day < WEEKDAYS.length; day += 1) {
    const ordered = slots
      .filter((slot) => slot.weekday === day)
      .sort((a, b) => a.start_minute - b.start_minute);
    for (let i = 1; i < ordered.length; i += 1) {
      if (ordered[i].start_minute < ordered[i - 1].end_minute) {
        return {
          error: `Los tramos del ${WEEKDAYS[day].toLowerCase()} se solapan`,
        };
      }
    }
  }

  return { slots };
}

function TimeInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-2 py-1 text-[0.75rem] text-white outline-none transition focus:border-dash_accent/40 focus:shadow-[0_0_0_3px_var(--ui-accent-ring)]"
    />
  );
}

/**
 * Editor del horario semanal de un asesor.
 *
 * Se edita la semana entera y se guarda de una vez (`PUT`): el backend
 * reemplaza las franjas, así que no hay estados a medias donde el asesor
 * quede con medio turno.
 */
export default function ScheduleModal({
  userName,
  initialSlots,
  saving,
  onSave,
  onClose,
}: {
  userName: string;
  initialSlots: ScheduleSlot[];
  saving: boolean;
  onSave: (slots: ScheduleSlot[]) => void;
  onClose: () => void;
}) {
  const [drafts, setDrafts] = useState<DraftSlot[]>(() =>
    toDrafts(initialSlots)
  );

  const byDay = useMemo(() => {
    const map = new Map<number, DraftSlot[]>();
    for (const draft of drafts) {
      const list = map.get(draft.weekday) ?? [];
      list.push(draft);
      map.set(draft.weekday, list);
    }
    return map;
  }, [drafts]);

  function toggleDay(weekday: number, enabled: boolean) {
    setDrafts((prev) =>
      enabled
        ? [
            ...prev,
            {
              key: nextKey(),
              weekday,
              start: DEFAULT_START,
              end: DEFAULT_END,
            },
          ]
        : prev.filter((draft) => draft.weekday !== weekday)
    );
  }

  function addSlot(weekday: number) {
    setDrafts((prev) => [
      ...prev,
      { key: nextKey(), weekday, start: DEFAULT_START, end: DEFAULT_END },
    ]);
  }

  function updateSlot(key: string, field: "start" | "end", value: string) {
    setDrafts((prev) =>
      prev.map((draft) =>
        draft.key === key ? { ...draft, [field]: value } : draft
      )
    );
  }

  function removeSlot(key: string) {
    setDrafts((prev) => prev.filter((draft) => draft.key !== key));
  }

  /** Copia el turno del primer día configurado al resto de días activos. */
  function copyToAllDays() {
    const source = drafts
      .filter((draft) => draft.weekday === drafts[0]?.weekday)
      .map(({ start, end }) => ({ start, end }));
    if (source.length === 0) return;

    const activeDays = [...new Set(drafts.map((d) => d.weekday))];
    setDrafts(
      activeDays.flatMap((weekday) =>
        source.map(({ start, end }) => ({
          key: nextKey(),
          weekday,
          start,
          end,
        }))
      )
    );
  }

  function handleSave() {
    const result = toPayload(drafts);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    onSave(result.slots);
  }

  return (
    <Modal title="Horario de acceso" onClose={onClose} size="lg">
      <div className="space-y-4">
        <p className="text-[0.8rem] text-white/45">
          Días y horas en las que <span className="text-white/70">{userName}</span>{" "}
          puede usar la plataforma, en hora de Colombia. Sin ningún día marcado
          entra a cualquier hora.
        </p>

        <div className="divide-y divide-white/[0.05] overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.02]">
          {WEEKDAYS.map((name, weekday) => {
            const daySlots = byDay.get(weekday) ?? [];
            const enabled = daySlots.length > 0;

            return (
              <div key={name} className="px-3.5 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <label className="flex cursor-pointer items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => toggleDay(weekday, e.target.checked)}
                      className="size-3.5 accent-[color:var(--ui-accent,#7c9cff)]"
                    />
                    <span
                      className={`text-[0.8rem] ${
                        enabled ? "text-white/75" : "text-white/30"
                      }`}
                    >
                      {name}
                    </span>
                  </label>

                  {enabled && (
                    <button
                      type="button"
                      onClick={() => addSlot(weekday)}
                      className="text-[0.7rem] font-medium text-white/35 transition hover:text-white/70"
                    >
                      + Otro tramo
                    </button>
                  )}
                </div>

                {enabled && (
                  <div className="mt-2 space-y-1.5 pl-6">
                    {daySlots.map((slot) => (
                      <div key={slot.key} className="flex items-center gap-2">
                        <TimeInput
                          value={slot.start}
                          onChange={(v) => updateSlot(slot.key, "start", v)}
                          label={`Inicio del ${name.toLowerCase()}`}
                        />
                        <span className="text-[0.75rem] text-white/25">a</span>
                        <TimeInput
                          value={slot.end}
                          onChange={(v) => updateSlot(slot.key, "end", v)}
                          label={`Fin del ${name.toLowerCase()}`}
                        />
                        {daySlots.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSlot(slot.key)}
                            aria-label="Quitar tramo"
                            className="rounded-lg p-1 text-white/25 transition hover:bg-white/[0.06] hover:text-red-400"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              aria-hidden
                              className="size-3.5"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M6 18 18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyToAllDays}
              disabled={drafts.length === 0 || saving}
              className={BTN_NEUTRAL}
            >
              Igualar días
            </button>
            <button
              type="button"
              onClick={() => setDrafts([])}
              disabled={drafts.length === 0 || saving}
              className={BTN_GHOST}
            >
              Quitar horario
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className={BTN_GHOST}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className={BTN_ACCENT}
            >
              {saving ? "Guardando…" : "Guardar horario"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
