import { activeEvents, type DoseEvent } from "./events";
import { MED_ORDER, RULES, type MedId } from "./rules";
import { minutesOfDay, parseDateKey, toMin } from "./time";

const H = 3_600_000;

export interface ScheduledDose {
  key: string;
  medId: MedId;
  /** 0-based position of this dose in the medicine's day. */
  slot: number;
  /** Scheduled local time "HH:MM" on the schedule day. */
  time: string;
}

export type DoseStatus = "given" | "skipped" | "overdue" | "due" | "upcoming";

/** Minutes before the scheduled time that a dose shows as "due". */
export const DUE_WINDOW_BEFORE = 15;
/** Minutes after the scheduled time that an un-ticked dose becomes "overdue". */
export const OVERDUE_AFTER = 30;

export function selectedMeds(selected: Partial<Record<MedId, boolean>>): MedId[] {
  return MED_ORDER.filter((id) => selected[id]);
}

export interface DoseWithStatus extends ScheduledDose {
  status: DoseStatus;
  record: DoseEvent | null;
}

const hhmm = (ms: number) => {
  const m = minutesOfDay(ms);
  return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
};

export function statusOf(dose: ScheduledDose, record: DoseEvent | null, nowMin: number): DoseStatus {
  if (record) return record.type === "skipped" ? "skipped" : "given";
  const t = toMin(dose.time);
  if (nowMin >= t + OVERDUE_AFTER) return "overdue";
  if (nowMin >= t - DUE_WINDOW_BEFORE) return "due";
  return "upcoming";
}

/**
 * The day's doses for each scheduled medicine, worked out from when doses are
 * actually given rather than fixed clock times:
 *
 * - The first dose of the day follows on from the last dose given before the
 *   day started (last dose + minimum interval). If there isn't one in range,
 *   it starts at the medicine's default first time (e.g. paracetamol 6:00 am).
 * - Each following dose is due one minimum interval after the previous dose
 *   was actually given (or after its scheduled time, if it was skipped or not
 *   yet recorded). So paracetamol first given at 8:00 am → 2:00 pm → 8:00 pm.
 * - At most `maxDosesIn24Hours` doses per day, and only times before midnight;
 *   the next dose rolls into tomorrow's schedule.
 */
export function daySchedule(
  selected: Partial<Record<MedId, boolean>>,
  postOpDay: number,
  events: DoseEvent[],
  slotDate: string,
  nowMin: number,
): DoseWithStatus[] {
  const dayStart = parseDateKey(slotDate).getTime();
  const dayEnd = dayStart + 24 * H;
  const active = activeEvents(events);
  const out: DoseWithStatus[] = [];

  for (const id of selectedMeds(selected)) {
    const r = RULES[id];
    if (r.scheduleType === "prn" || !r.firstTime) continue;
    if (r.scheduleType === "selected_days" && !r.postOpDays?.includes(postOpDay)) continue;
    const gap = r.minIntervalHours * H;

    const before = active.filter((e) => e.medId === id && e.type === "given" && e.at < dayStart);
    const prev = before.reduce<DoseEvent | null>((acc, e) => (!acc || e.at > acc.at ? e : acc), null);
    const carried = prev ? prev.at + gap : -Infinity;
    let t = carried >= dayStart && carried < dayEnd ? carried : dayStart + toMin(r.firstTime) * 60_000;

    const today = active.filter((e) => e.medId === id && e.slotDate === slotDate && e.slotIndex !== undefined);
    for (let slot = 0; slot < r.maxDosesIn24Hours && t < dayEnd; slot++) {
      const record = today.filter((e) => e.slotIndex === slot).reduce<DoseEvent | null>((acc, e) => (!acc || e.at >= acc.at ? e : acc), null);
      const dose: ScheduledDose = { key: id + "-" + slot, medId: id, slot, time: hhmm(t) };
      out.push({ ...dose, record, status: statusOf(dose, record, nowMin) });
      t = (record?.type === "given" ? record.at : t) + gap;
    }
  }
  return out.sort((a, b) => toMin(a.time) - toMin(b.time) || MED_ORDER.indexOf(a.medId) - MED_ORDER.indexOf(b.medId));
}
